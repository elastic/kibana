/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type { EsWorkflowCreate, WorkflowYaml } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  getManagedWorkflowDefinitions,
  type ManagedWorkflowDefinition,
  type ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  ExecuteManagedWorkflowOptions,
  ManagedWorkflowOperationOptions,
} from '@kbn/workflows/server/types';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { parseYamlToJSONWithoutValidation, updateYamlField } from '@kbn/workflows-yaml';
import type { WorkflowCrudService } from './workflow_crud_service';
import { computeDefinitionHash, getTriggerTypesFromDefinition } from '../api/lib/workflow_prepare';
import type { WorkflowProperties } from '../storage/workflow_storage';

const MANAGED_WORKFLOW_SYSTEM_USER = 'system';

interface ManagedWorkflowsServiceDeps {
  crudService: WorkflowCrudService;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  logger: Logger;
}

export class ManagedWorkflowsService {
  private readonly registeredPluginIds = new Set<string>();
  private readonly readyPluginIds = new Set<string>();
  /**
   * Tracks every static workflow installed during the startup window, keyed by plugin ID.
   * Each entry is a composite key of `${workflowDocumentId}:${spaceId}` — this captures
   * both the suffix variation and the target space so that reconciliation can detect
   * individual instances that were not re-installed across restarts.
   */
  private readonly installedDocKeysByPlugin = new Map<string, Set<string>>();
  private readonly logger: Logger;

  constructor(private readonly deps: ManagedWorkflowsServiceDeps) {
    this.logger = deps.logger;
  }

  public async registerManagedWorkflowPlugin(
    pluginId: string,
    _options?: { spaceId?: string }
  ): Promise<void> {
    if (!pluginId) {
      throw new Error('pluginId is required to register managed workflows plugin');
    }
    this.registeredPluginIds.add(pluginId);
  }

  public isPluginReady(pluginId: string): boolean {
    return this.readyPluginIds.has(pluginId);
  }

  /**
   * Called when a plugin signals it has finished installing all its static workflows.
   * Triggers per-plugin reconciliation: removes persisted static workflows that were
   * not installed during the startup window.
   */
  public async pluginReady(pluginId: string): Promise<void> {
    if (this.readyPluginIds.has(pluginId)) {
      this.logger.warn(
        `Managed workflows: plugin '${pluginId}' called ready() more than once. Ignoring.`
      );
      return;
    }
    this.readyPluginIds.add(pluginId);
    await this.reconcilePluginStaticWorkflows(pluginId);
  }

  /**
   * Global cleanup for workflows whose owner plugin is no longer registered
   * or whose definition no longer exists in the registry.
   * Safe to run immediately at start — no dependency on install() calls.
   */
  public async cleanupUnregisteredOrphans(registeredPluginIds: string[]): Promise<void> {
    const knownDefinitionIds = new Set(getManagedWorkflowDefinitions().map((d) => d.id));
    const knownPluginIds = new Set(registeredPluginIds.filter(Boolean));

    const existingManagedDocs = await this.deps.crudService.getManagedWorkflowDocumentsAllSpaces({
      includeDeleted: true,
    });

    const orphanIdsBySpace = new Map<string, string[]>();
    for (const { id, source } of existingManagedDocs) {
      const owner = source.managedBy ?? undefined;
      const definitionId = source.originSystemWorkflowId ?? undefined;

      const isHardOrphan =
        !owner ||
        !definitionId ||
        !knownPluginIds.has(owner) ||
        !knownDefinitionIds.has(definitionId);

      if (isHardOrphan) {
        const workflowSpaceId = source.spaceId;
        const ids = orphanIdsBySpace.get(workflowSpaceId) ?? [];
        ids.push(id);
        orphanIdsBySpace.set(workflowSpaceId, ids);
      }
    }

    for (const [spaceId, orphanIds] of orphanIdsBySpace) {
      if (orphanIds.length > 0) {
        this.logger.info(
          `Managed workflows: removing ${orphanIds.length} hard-orphaned workflow(s) in space '${spaceId}' ` +
            `(unregistered owner or removed definition)`
        );
        await this.deps.crudService.deleteWorkflows(orphanIds, spaceId, { force: true });
      }
    }
  }

  public async installManagedWorkflow(
    id: string,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string
  ): Promise<void> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = this.getRequiredSpaceId(options);

    this.trackInstall(registeredPluginId, id, workflowDocumentId, spaceId);

    const isStartupWindow = !this.readyPluginIds.has(registeredPluginId);
    const now = new Date().toISOString();
    const definitionHash = this.computeManagedDefinitionHash(definition);
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId
    );
    const { yaml, managedTemplateValues } = this.resolveManagedWorkflowYaml({
      definition,
      values: options.values,
      existingTemplateValues: existing?.managedTemplateValues,
    });

    if (!existing) {
      const document = this.buildManagedWorkflowDocument({
        definition,
        yaml,
        managedTemplateValues,
        spaceId,
        now,
        definitionHash,
      });
      await this.deps.crudService.indexWorkflowDocument(workflowDocumentId, document);
      return;
    }

    if (!existing.managed) {
      throw new Error(
        `Cannot install managed workflow '${id}' as '${workflowDocumentId}' because a user workflow with the same id already exists`
      );
    }

    if (existing.definitionHash === definitionHash) {
      if (this.areTemplateValuesEqual(existing.managedTemplateValues, managedTemplateValues)) {
        return;
      }
    }

    if (definition.management.versionStrategy === 'on_adopt' && isStartupWindow) {
      return;
    }

    const enabled = definition.management.enablement === 'enforced' ? undefined : existing.enabled;
    const document = this.buildManagedWorkflowDocument({
      definition,
      yaml,
      managedTemplateValues,
      spaceId,
      now,
      definitionHash,
      enabled,
      createdAt: existing.created_at,
    });
    await this.deps.crudService.indexWorkflowDocument(workflowDocumentId, document);
  }

  public async uninstallManagedWorkflow(
    id: string,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string
  ): Promise<void> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = this.getRequiredSpaceId(options);
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId,
      {
        includeDeleted: true,
      }
    );
    if (!existing || !existing.managed) {
      return;
    }

    await this.deps.crudService.deleteWorkflows([workflowDocumentId], spaceId, { force: true });
  }

  public async executeManagedWorkflow(
    id: string,
    request: KibanaRequest,
    options: ExecuteManagedWorkflowOptions,
    registeredPluginId: string
  ): Promise<string> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = this.getRequiredSpaceId(options);
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId,
      {
        includeGlobal: true,
      }
    );
    if (!existing || !existing.managed) {
      throw new Error(`Managed workflow '${id}' as '${workflowDocumentId}' not found`);
    }
    if (!existing.definition) {
      throw new Error(
        `Managed workflow '${id}' as '${workflowDocumentId}' has no valid definition`
      );
    }

    const context: Record<string, unknown> = {
      spaceId,
      inputs: options.inputs ?? {},
      triggeredBy: options.triggeredBy ?? 'manual',
    };
    if (options.metadata) {
      context.metadata = options.metadata;
    }

    const response = await this.deps.workflowsExecutionEngine.executeWorkflow(
      {
        id: workflowDocumentId,
        name: existing.name,
        enabled: existing.enabled,
        definition: existing.definition,
        yaml: existing.yaml,
        ...(existing.managed === true ? { managed: true } : {}),
        ...(typeof existing.originSystemWorkflowId === 'string'
          ? { originSystemWorkflowId: existing.originSystemWorkflowId }
          : {}),
      },
      context,
      request
    );

    return response.workflowExecutionId;
  }

  /**
   * Per-plugin reconciliation triggered by ready().
   * Removes persisted static workflow documents whose definition was NOT installed
   * during the startup window.
   */
  /**
   * Per-plugin reconciliation triggered by ready().
   * Removes persisted static workflow documents that were NOT installed during the
   * startup window. Compares at the (workflowDocumentId, spaceId) level so that
   * suffix-based and per-space instances are individually tracked.
   */
  private async reconcilePluginStaticWorkflows(pluginId: string): Promise<void> {
    const installedDocKeys = this.installedDocKeysByPlugin.get(pluginId) ?? new Set<string>();

    const staticDefinitionIds = new Set(
      getManagedWorkflowDefinitions()
        .filter((d) => d.pluginId === pluginId && d.management.lifecycle === 'static')
        .map((d) => d.id)
    );

    if (staticDefinitionIds.size === 0) {
      return;
    }

    const existingManagedDocs = await this.deps.crudService.getManagedWorkflowDocumentsAllSpaces({
      includeDeleted: true,
    });

    const orphanIdsBySpace = new Map<string, string[]>();
    for (const { id: docId, source } of existingManagedDocs) {
      const owner = source.managedBy;
      const definitionId = source.originSystemWorkflowId;
      const isPluginStaticDoc =
        owner === pluginId && !!definitionId && staticDefinitionIds.has(definitionId);

      if (isPluginStaticDoc) {
        const workflowSpaceId = source.spaceId ?? GLOBAL_WORKFLOW_SPACE_ID;
        const docKey = `${docId}:${workflowSpaceId}`;

        if (!installedDocKeys.has(docKey)) {
          const ids = orphanIdsBySpace.get(workflowSpaceId) ?? [];
          ids.push(docId);
          orphanIdsBySpace.set(workflowSpaceId, ids);
        }
      }
    }

    for (const [spaceId, orphanIds] of orphanIdsBySpace) {
      if (orphanIds.length > 0) {
        this.logger.info(
          `Managed workflows: removing ${orphanIds.length} orphaned static workflow(s) ` +
            `for plugin '${pluginId}' in space '${spaceId}'`
        );
        await this.deps.crudService.deleteWorkflows(orphanIds, spaceId, { force: true });
      }
    }
  }

  private trackInstall(
    pluginId: string,
    definitionId: string,
    workflowDocumentId: string,
    spaceId: string
  ): void {
    let docKeys = this.installedDocKeysByPlugin.get(pluginId);
    if (!docKeys) {
      docKeys = new Set();
      this.installedDocKeysByPlugin.set(pluginId, docKeys);
    }
    docKeys.add(`${workflowDocumentId}:${spaceId}`);

    if (this.readyPluginIds.has(pluginId)) {
      const definition = getManagedWorkflowDefinition(definitionId);
      if (definition && definition.management.lifecycle === 'static') {
        this.logger.warn(
          `Managed workflows: '${workflowDocumentId}' (static workflow '${definitionId}') installed by plugin ` +
            `'${pluginId}' after ready(). Static workflows should be installed before calling ready(). ` +
            `Consider using lifecycle: 'dynamic' or installing during start().`
        );
      }
    }
  }

  private buildManagedWorkflowDocument(params: {
    definition: ManagedWorkflowDefinition;
    yaml: string;
    managedTemplateValues: ManagedWorkflowTemplateValues | null;
    spaceId: string;
    now: string;
    definitionHash: string;
    enabled?: boolean;
    createdAt?: string;
  }): WorkflowProperties {
    const { definition, yaml, managedTemplateValues, spaceId, now, definitionHash, createdAt } =
      params;
    const parsed = parseYamlToJSONWithoutValidation(yaml);

    let workflowModel: EsWorkflowCreate | null = null;
    if (parsed.success && parsed.json && typeof parsed.json === 'object') {
      try {
        workflowModel = transformWorkflowYamlJsontoEsWorkflow(
          parsed.json as unknown as WorkflowYaml
        );
      } catch {
        workflowModel = null;
      }
    }

    const yamlDefinedEnabled = workflowModel?.enabled ?? true;
    const resolvedEnabled = params.enabled ?? yamlDefinedEnabled;
    const resolvedYaml = updateYamlField(yaml, 'enabled', resolvedEnabled);
    const resolvedDefinition = workflowModel?.definition
      ? {
          ...workflowModel.definition,
          enabled: resolvedEnabled,
        }
      : null;

    return {
      name: workflowModel?.name ?? definition.id,
      description: workflowModel?.description,
      enabled: resolvedEnabled,
      tags: workflowModel?.tags ?? [],
      triggerTypes: getTriggerTypesFromDefinition(resolvedDefinition ?? undefined),
      yaml: resolvedYaml,
      definition: resolvedDefinition,
      createdBy: MANAGED_WORKFLOW_SYSTEM_USER,
      lastUpdatedBy: MANAGED_WORKFLOW_SYSTEM_USER,
      spaceId,
      managed: true,
      managedBy: definition.pluginId,
      definitionHash,
      managedTemplateValues: managedTemplateValues as Record<string, unknown> | null,
      originSystemWorkflowId: definition.id,
      lifecycle: definition.management.lifecycle,
      deleted_at: null,
      valid: workflowModel?.valid ?? false,
      created_at: createdAt ?? now,
      updated_at: now,
    };
  }

  private assertPluginRegistration(
    definition: ManagedWorkflowDefinition,
    registeredPluginId: string
  ): void {
    if (registeredPluginId !== definition.pluginId) {
      throw new Error(
        `Managed workflow '${definition.id}' is owned by plugin '${definition.pluginId}' but was registered by '${registeredPluginId}'`
      );
    }
  }

  private resolveWorkflowDocumentId(id: string, options: ManagedWorkflowOperationOptions): string {
    const customId = options.workflowId?.trim();
    const suffix = options.workflowIdSuffix?.trim();

    if (customId && suffix) {
      throw new Error(
        `Managed workflow '${id}' cannot be installed with both workflowId and workflowIdSuffix`
      );
    }

    if (suffix) {
      return `${id}-${suffix}`;
    }

    if (customId) {
      if (!customId.startsWith(`${id}-`) && customId !== id) {
        throw new Error(
          `Managed workflow '${id}' custom workflowId must equal '${id}' or start with '${id}-'`
        );
      }
      return customId;
    }

    return id;
  }

  private getRequiredSpaceId(options: ManagedWorkflowOperationOptions): string {
    const spaceId = options.spaceId?.trim();
    if (!spaceId) {
      throw new Error(
        `Managed workflow operations require an explicit spaceId. Use '${GLOBAL_WORKFLOW_SPACE_ID}' for global workflows.`
      );
    }
    return spaceId;
  }

  private resolveManagedWorkflowYaml(params: {
    definition: ManagedWorkflowDefinition;
    values?: ManagedWorkflowTemplateValues;
    existingTemplateValues?: ManagedWorkflowTemplateValues | null;
  }): { yaml: string; managedTemplateValues: ManagedWorkflowTemplateValues | null } {
    const { definition, values, existingTemplateValues } = params;

    if (definition.yamlTemplate) {
      const templateValues = values ?? existingTemplateValues ?? {};
      const yaml = definition.yamlTemplate(templateValues);
      return {
        yaml,
        managedTemplateValues: templateValues,
      };
    }

    if (!definition.yaml) {
      throw new Error(
        `Managed workflow '${definition.id}' must define either yaml or yamlTemplate`
      );
    }
    if (values) {
      throw new Error(
        `Managed workflow '${definition.id}' does not define yamlTemplate but values were provided`
      );
    }

    return {
      yaml: definition.yaml,
      managedTemplateValues: null,
    };
  }

  private computeManagedDefinitionHash(definition: ManagedWorkflowDefinition): string {
    if (definition.yamlTemplate) {
      return computeDefinitionHash(definition.yamlTemplate.toString());
    }
    if (!definition.yaml) {
      throw new Error(
        `Managed workflow '${definition.id}' must define either yaml or yamlTemplate`
      );
    }
    return computeDefinitionHash(definition.yaml);
  }

  private areTemplateValuesEqual(
    existing: ManagedWorkflowTemplateValues | null | undefined,
    next: ManagedWorkflowTemplateValues | null
  ): boolean {
    return JSON.stringify(existing ?? null) === JSON.stringify(next ?? null);
  }
}
