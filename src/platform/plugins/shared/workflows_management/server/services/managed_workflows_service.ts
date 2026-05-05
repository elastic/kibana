/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type { EsWorkflowCreate, WorkflowYaml } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  getManagedWorkflowDefinitions,
  type ManagedWorkflowId,
  type ResolvedManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import type {
  ExecuteManagedWorkflowOptions,
  ManagedWorkflowOperationOptions,
} from '@kbn/workflows/server/types';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { parseYamlToJSONWithoutValidation, updateYamlField } from '@kbn/workflows-yaml';
import type { WorkflowCrudService } from './workflow_crud_service';
import { computeDefinitionHash, getTriggerTypesFromDefinition } from '../api/lib/workflow_prepare';
import type { WorkflowProperties } from '../storage/workflow_storage';

const DEFAULT_MANAGED_WORKFLOW_SPACE_ID = 'default';
const MANAGED_WORKFLOW_SYSTEM_USER = 'system';

interface ManagedWorkflowsServiceDeps {
  crudService: WorkflowCrudService;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
}

interface InstallManagedWorkflowOptions extends ManagedWorkflowOperationOptions {
  isStartupReconcile?: boolean;
}

export class ManagedWorkflowsService {
  private readonly registeredPluginIds = new Set<string>();

  constructor(private readonly deps: ManagedWorkflowsServiceDeps) {}

  public async registerManagedWorkflowPlugin(
    pluginId: string,
    _options?: { spaceId?: string }
  ): Promise<void> {
    if (!pluginId) {
      throw new Error('pluginId is required to register managed workflows plugin');
    }
    this.registeredPluginIds.add(pluginId);
  }

  public async reconcileManagedWorkflowOrphans(
    pluginIds: string[],
    options?: { spaceId?: string }
  ): Promise<void> {
    this.registeredPluginIds.clear();
    pluginIds.filter(Boolean).forEach((pluginId) => this.registeredPluginIds.add(pluginId));
    await this.cleanupOrphanManagedWorkflows(options);
  }

  public async installManagedWorkflow(
    id: ManagedWorkflowId,
    options?: InstallManagedWorkflowOptions,
    registeredPluginId?: string
  ): Promise<void> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = options?.spaceId ?? DEFAULT_MANAGED_WORKFLOW_SPACE_ID;
    const now = new Date().toISOString();
    const definitionHash = computeDefinitionHash(definition.yaml);
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId
    );

    if (!existing) {
      const document = this.buildManagedWorkflowDocument({
        definition,
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
      return;
    }

    if (definition.management.versionStrategy === 'on_adopt' && options?.isStartupReconcile) {
      return;
    }

    const enabled = definition.management.enablement === 'enforced' ? undefined : existing.enabled;
    const document = this.buildManagedWorkflowDocument({
      definition,
      spaceId,
      now,
      definitionHash,
      enabled,
      createdAt: existing.created_at,
    });
    await this.deps.crudService.indexWorkflowDocument(workflowDocumentId, document);
  }

  public async uninstallManagedWorkflow(
    id: ManagedWorkflowId,
    options?: ManagedWorkflowOperationOptions,
    registeredPluginId?: string
  ): Promise<void> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = options?.spaceId ?? DEFAULT_MANAGED_WORKFLOW_SPACE_ID;
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
    id: ManagedWorkflowId,
    request: KibanaRequest,
    options?: ExecuteManagedWorkflowOptions,
    registeredPluginId?: string
  ): Promise<string> {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);

    const workflowDocumentId = this.resolveWorkflowDocumentId(id, options);
    const spaceId = options?.spaceId ?? DEFAULT_MANAGED_WORKFLOW_SPACE_ID;
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId
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
      inputs: options?.inputs ?? {},
      triggeredBy: options?.triggeredBy ?? 'manual',
    };
    if (options?.metadata) {
      context.metadata = options.metadata;
    }

    const response = await this.deps.workflowsExecutionEngine.executeWorkflow(
      {
        id: workflowDocumentId,
        name: existing.name,
        enabled: existing.enabled,
        definition: existing.definition,
        yaml: existing.yaml,
      },
      context,
      request
    );

    return response.workflowExecutionId;
  }

  private buildManagedWorkflowDocument(params: {
    definition: ResolvedManagedWorkflowDefinition;
    spaceId: string;
    now: string;
    definitionHash: string;
    enabled?: boolean;
    createdAt?: string;
  }): WorkflowProperties {
    const { definition, spaceId, now, definitionHash, createdAt } = params;
    const parsed = parseYamlToJSONWithoutValidation(definition.yaml);

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
    const resolvedYaml = updateYamlField(definition.yaml, 'enabled', resolvedEnabled);
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
      originSystemWorkflowId: definition.id,
      lifecycle: definition.management.lifecycle,
      deleted_at: null,
      valid: workflowModel?.valid ?? false,
      created_at: createdAt ?? now,
      updated_at: now,
    };
  }

  private assertPluginRegistration(
    definition: ResolvedManagedWorkflowDefinition,
    registeredPluginId?: string
  ): void {
    if (!registeredPluginId) {
      return;
    }

    if (registeredPluginId !== definition.pluginId) {
      throw new Error(
        `Managed workflow '${definition.id}' is owned by plugin '${definition.pluginId}' but was registered by '${registeredPluginId}'`
      );
    }
  }

  private resolveWorkflowDocumentId(
    id: ManagedWorkflowId,
    options?: ManagedWorkflowOperationOptions
  ): string {
    const customId = options?.workflowId?.trim();
    const suffix = options?.workflowIdSuffix?.trim();

    if (customId && suffix) {
      throw new Error(
        `Managed workflow '${id}' cannot be installed with both workflowId and workflowIdSuffix`
      );
    }

    if (suffix) {
      return `${id}--${suffix}`;
    }

    if (customId) {
      if (!customId.startsWith(`${id}--`) && customId !== id) {
        throw new Error(
          `Managed workflow '${id}' custom workflowId must equal '${id}' or start with '${id}--'`
        );
      }
      return customId;
    }

    return id;
  }

  private async cleanupOrphanManagedWorkflows(options?: { spaceId?: string }): Promise<void> {
    const spaceId = options?.spaceId ?? DEFAULT_MANAGED_WORKFLOW_SPACE_ID;
    const registeredDefinitions = getManagedWorkflowDefinitions().filter((definition) =>
      this.registeredPluginIds.has(definition.pluginId)
    );
    const activeDefinitionIds = new Set(registeredDefinitions.map((definition) => definition.id));
    const activePluginIds = new Set(registeredDefinitions.map((definition) => definition.pluginId));

    const existingManagedDocs = await this.deps.crudService.getManagedWorkflowDocuments(spaceId, {
      includeDeleted: true,
    });

    const orphanIds = existingManagedDocs
      .filter(({ source }) => {
        const owner = source.managedBy ?? undefined;
        const definitionId = source.originSystemWorkflowId ?? undefined;
        if (!owner || !definitionId) {
          return true;
        }
        if (!activePluginIds.has(owner)) {
          return true;
        }
        return !activeDefinitionIds.has(definitionId);
      })
      .map(({ id }) => id);

    if (orphanIds.length === 0) {
      return;
    }

    await this.deps.crudService.deleteWorkflows(orphanIds, spaceId, { force: true });
  }
}
