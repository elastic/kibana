/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import pMap from 'p-map';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_RETRY_DELAY_MS, delayMs } from '@kbn/occ';
import { requiresDelegatedIdentity, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  getManagedWorkflowDefinition,
  getManagedWorkflowDefinitions,
  getManagedWorkflowVisibilityContexts,
  type ManagedWorkflowDefinition,
  type ManagedWorkflowId,
  type ManagedWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type {
  ExecuteManagedWorkflowOptions,
  GetManagedWorkflowStatusOptions,
  ManagedWorkflowInstallFailure,
  ManagedWorkflowInstallManyResult,
  ManagedWorkflowOperationOptions,
  ManagedWorkflowServiceInstallManyItem,
  ManagedWorkflowServiceInstallOptions,
  ManagedWorkflowStatus,
  ManagedWorkflowStatusReport,
} from '@kbn/workflows/server/types';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { updateYamlField, WorkflowConflictError } from '@kbn/workflows-yaml';
import type { WorkflowCrudService } from './workflow_crud_service';
import type {
  ManagedWorkflowOrphan,
  VersionedWorkflowDocument,
  WorkflowDocumentBulkWriteResult,
} from './workflow_occ_types';
import {
  WorkflowChangeHistoryAction,
  type WorkflowChangeHistoryActionType,
} from '../../common/lib/workflow_change_history/constants';
import type { WorkflowManagementAuditLog } from '../api/routes/utils/workflow_audit_logging';
import { WorkflowRequiresDelegatedIdentityError } from '../api/workflow_requires_delegated_identity_error';
import { chunkByCountAndBytes } from '../lib/chunk_by_count_and_bytes';
import { applyWorkflowVersion } from '../lib/workflow_version';
import { isRetryableWorkflowWriteConflict } from '../lib/workflow_write_conflicts';
import type { WorkflowProperties } from '../storage/workflow_storage';

const MANAGED_WORKFLOW_SYSTEM_USER = 'elastic/kibana';
const MAX_MANAGED_INSTALL_RETRIES = 2;
const ORPHAN_DELETE_CONCURRENCY = 10;
/**
 * Bounds of one `_bulk` request in `installManagedWorkflows`. Each request goes to the index's one
 * shard and holds one `system_write` thread until its refresh, so a pass never holds more than one.
 */
export const MANAGED_INSTALL_BULK_MAX_DOCUMENTS = 50;
export const MANAGED_INSTALL_BULK_MAX_BYTES = 2 * 1024 * 1024;

const computeDefinitionHash = (yaml: string): string => {
  return createHash('sha256').update(yaml.trim()).digest('hex');
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

type ManagedInstallPlan =
  | { action: 'skip' }
  | {
      action: 'create';
      yaml: string;
      managedTemplateValues: ManagedWorkflowTemplateValues | null;
    }
  | {
      action: 'update';
      yaml: string;
      managedTemplateValues: ManagedWorkflowTemplateValues | null;
      stored: VersionedWorkflowDocument;
    };

/** A batch item resolved to its definition, workflow document and space. */
interface ManagedInstallTarget {
  id: ManagedWorkflowId;
  definition: ManagedWorkflowDefinition;
  workflowDocumentId: string;
  spaceId: string;
  definitionHash: string;
  values?: ManagedWorkflowTemplateValues;
}

interface ManagedInstallWrite {
  target: ManagedInstallTarget;
  document: WorkflowProperties;
  /** The stored document an update replaces; undefined for a create. */
  stored?: VersionedWorkflowDocument;
}

interface ManagedWorkflowsServiceDeps {
  crudService: WorkflowCrudService;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  logger: Logger;
  /** When true, abort before primary ES writes (plugin stop mid-install). */
  isStopping?: () => boolean;
  audit?: Pick<
    WorkflowManagementAuditLog,
    'logWorkflowCreated' | 'logWorkflowUpdated' | 'logWorkflowDeleted'
  >;
}

export class ManagedWorkflowsService {
  private readonly readyPluginIds = new Set<string>();
  /**
   * Tracks every static workflow installed during the startup window, keyed by plugin ID.
   * Each entry is a composite key of `${workflowDocumentId}:${spaceId}` — this captures
   * both the suffix variation and the target space so that reconciliation can detect
   * individual instances that were not re-installed across restarts.
   */
  private readonly installedDocKeysByPlugin = new Map<string, Set<string>>();
  /**
   * Plugins whose managed install pass did not complete this boot (readiness gate skip
   * or mid-install abort). Destructive ready() orphan cleanup must not run for these —
   * `installedDocKeys` is only trustworthy when every install actually ran. Dynamic auto
   * upgrades may still run once Elasticsearch readiness has already passed at ready().
   */
  private readonly incompleteInstallPluginIds = new Set<string>();
  private readonly logger: Logger;

  constructor(private readonly deps: ManagedWorkflowsServiceDeps) {
    this.logger = deps.logger;
  }

  private shouldAbortManagedWrite(operation: string): boolean {
    if (!this.deps.isStopping?.()) {
      return false;
    }
    this.logger.warn(`Managed workflows: skipping ${operation} (stopping)`);
    return true;
  }

  /**
   * Marks that this plugin's managed install pass is incomplete for this boot.
   * Call when an install is gated out before reaching ManagedWorkflowsService, or when
   * a mid-install write is aborted. ready() will skip destructive orphan cleanup but may
   * still run dynamic auto upgrades.
   */
  public markInstallIncomplete(pluginId: string): void {
    this.incompleteInstallPluginIds.add(pluginId);
  }

  public isPluginReady(pluginId: string): boolean {
    return this.readyPluginIds.has(pluginId);
  }

  /**
   * Called when a plugin signals it has finished installing all its static workflows.
   * Triggers per-plugin reconciliation: removes persisted static workflows that were
   * not installed during the startup window and upgrades dynamic auto workflows.
   * Destructive orphan cleanup is skipped when any install for this plugin was gated or
   * aborted incomplete this boot — see {@link markInstallIncomplete}. Dynamic auto
   * upgrades still run when ready() itself passed Elasticsearch readiness.
   */
  public async pluginReady(pluginId: string): Promise<void> {
    if (this.readyPluginIds.has(pluginId)) {
      this.logger.warn(
        `Managed workflows: plugin '${pluginId}' called ready() more than once. Ignoring.`
      );
      return;
    }
    await this.reconcilePluginManagedWorkflows(pluginId);
    this.readyPluginIds.add(pluginId);
  }

  /**
   * Global cleanup for workflows whose owner plugin is no longer registered
   * or whose definition no longer exists in the registry.
   * Safe to run immediately at start — no dependency on install() calls.
   */
  public async cleanupUnregisteredOrphans(registeredOwnerPluginIds: string[]): Promise<void> {
    const knownDefinitionIds = new Set(getManagedWorkflowDefinitions().map((d) => d.id));
    const knownPluginIds = new Set(registeredOwnerPluginIds.filter(Boolean));

    const existingManagedDocs = await this.deps.crudService.getManagedWorkflowDocumentsAllSpaces({
      includeDeleted: true,
    });

    const orphanWorkflowsBySpace = new Map<
      string,
      Array<{ id: string; source: WorkflowProperties }>
    >();
    for (const { id, source } of existingManagedDocs) {
      const owner = source.managedBy ?? undefined;
      const definitionId = source.originManagedWorkflowId ?? undefined;

      const isHardOrphan =
        !owner ||
        !definitionId ||
        !knownPluginIds.has(owner) ||
        !knownDefinitionIds.has(definitionId);

      if (isHardOrphan) {
        const workflowSpaceId = source.spaceId;
        const workflows = orphanWorkflowsBySpace.get(workflowSpaceId) ?? [];
        workflows.push({ id, source });
        orphanWorkflowsBySpace.set(workflowSpaceId, workflows);
      }
    }

    for (const [spaceId, orphanWorkflows] of orphanWorkflowsBySpace) {
      if (orphanWorkflows.length > 0) {
        this.logger.info(
          `Managed workflows: removing ${orphanWorkflows.length} hard-orphaned workflow(s) in space '${spaceId}' ` +
            `(unregistered owner or removed definition)`
        );
        await this.forceDeleteOrphans(orphanWorkflows, spaceId, 'orphan_cleanup');
      }
    }
  }

  public async installManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowServiceInstallOptions,
    registeredPluginId: string,
    request?: KibanaRequest
  ): Promise<void> {
    for (let attempt = 0; attempt <= MAX_MANAGED_INSTALL_RETRIES; attempt++) {
      try {
        await this.installManagedWorkflowOnce(id, options, registeredPluginId, request);
        return;
      } catch (error) {
        if (!isRetryableWorkflowWriteConflict(error) || attempt === MAX_MANAGED_INSTALL_RETRIES) {
          throw error;
        }

        this.logger.debug(
          `Managed workflows: retrying install for '${id}' after concurrent update conflict`
        );
      }
    }
  }

  private async installManagedWorkflowOnce(
    id: ManagedWorkflowId,
    options: ManagedWorkflowServiceInstallOptions,
    registeredPluginId: string,
    request?: KibanaRequest
  ): Promise<void> {
    const { definition, workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
      id,
      options,
      registeredPluginId
    );

    // Abort before trackInstall; mark incomplete so ready() does not treat a gated skip
    // as "owner removed this workflow" and force-delete persisted docs.
    if (this.shouldAbortManagedWrite(`install '${id}'`)) {
      this.markInstallIncomplete(registeredPluginId);
      return;
    }

    this.trackInstall(registeredPluginId, id, workflowDocumentId, spaceId);

    const isStartupWindow = !this.readyPluginIds.has(registeredPluginId);
    const now = new Date();
    const definitionHash = this.computeManagedDefinitionHash(definition);
    const existingDocument = await this.deps.crudService.getWorkflowDocumentWithVersion(
      workflowDocumentId,
      spaceId
    );
    const existing = existingDocument?.source;
    if (
      options.expectedDocumentVersion !== undefined &&
      (existing == null || (existing.version ?? null) !== options.expectedDocumentVersion)
    ) {
      this.logger.debug(
        `Managed workflows: skipping install for '${id}' because document version ${
          existing == null ? 'missing' : String(existing.version ?? null)
        } does not match expected ${String(options.expectedDocumentVersion)}`
      );
      return;
    }
    const plan = this.planManagedInstall({
      id,
      definition,
      workflowDocumentId,
      definitionHash,
      values: options.values,
      stored: existingDocument ?? undefined,
      isStartupWindow,
    });

    if (plan.action === 'skip') {
      return;
    }

    const { yaml, managedTemplateValues } = plan;
    if (plan.action === 'create') {
      if (this.shouldAbortManagedWrite(`install create '${id}'`)) {
        // Never wrote — untrack so a *complete* later pass can orphan-clean; mark incomplete
        // so ready() this boot does not delete other still-desired docs.
        this.untrackInstall(registeredPluginId, workflowDocumentId, spaceId);
        this.markInstallIncomplete(registeredPluginId);
        return;
      }
      const documentWithVersion = await this.buildManagedInstallDocument({
        definition,
        workflowDocumentId,
        yaml,
        managedTemplateValues,
        definitionHash,
        spaceId,
        now,
      });
      if (this.shouldAbortManagedWrite(`install create '${id}'`)) {
        this.untrackInstall(registeredPluginId, workflowDocumentId, spaceId);
        this.markInstallIncomplete(registeredPluginId);
        return;
      }
      const savedDocument = await this.deps.crudService.createWorkflowDocument(
        workflowDocumentId,
        spaceId,
        documentWithVersion,
        request
      );
      await this.deps.crudService.logWorkflowChangesAfterWrite({
        workflows: [{ id: workflowDocumentId, document: savedDocument }],
        action: WorkflowChangeHistoryAction.workflowInstall,
        spaceId,
        timestamp: now,
      });
      this.deps.audit?.logWorkflowCreated(request, {
        id: workflowDocumentId,
        managed: true,
        originalWorkflowId: definition.id,
        ownerPlugin: definition.pluginId,
        spaceId,
        reason: 'install',
      });
      return;
    }

    const { stored } = plan;
    const documentWithVersion = await this.buildManagedInstallDocument({
      definition,
      workflowDocumentId,
      yaml,
      managedTemplateValues,
      definitionHash,
      spaceId,
      now,
      existing: stored.source,
    });
    if (this.shouldAbortManagedWrite(`install update '${id}'`)) {
      // Keep track so orphan cleanup (if it ran) would preserve working v1; mark incomplete
      // so ready() skips destructive orphan deletes and we retry the upgrade later.
      this.markInstallIncomplete(registeredPluginId);
      return;
    }
    const savedDocument = await this.deps.crudService.writeWorkflowDocumentWithOcc(
      workflowDocumentId,
      spaceId,
      {
        document: documentWithVersion,
        request,
        // Only registered code upgrades may reuse an existing delegation without a user request.
        ...(!request &&
        definition.management.versionStrategy === 'auto' &&
        stored.source.definition?.settings?.run_as &&
        this.areTemplateValuesEqual(stored.source.managedTemplateValues, managedTemplateValues)
          ? {
              managedWorkflowUpgrade: {
                pluginId: registeredPluginId,
                definitionId: definition.id,
              },
            }
          : {}),
        ifSeqNo: stored.seqNo,
        ifPrimaryTerm: stored.primaryTerm,
      }
    );
    if (savedDocument.version !== stored.source.version) {
      await this.deps.crudService.logWorkflowChangesAfterWrite({
        workflows: [{ id: workflowDocumentId, document: savedDocument }],
        action: WorkflowChangeHistoryAction.workflowUpdate,
        spaceId,
        timestamp: now,
      });
    }
    this.deps.audit?.logWorkflowUpdated(request, {
      id: workflowDocumentId,
      managed: true,
      originalWorkflowId: definition.id,
      ownerPlugin: definition.pluginId,
      spaceId,
      reason: 'reinstall',
    });
  }

  /**
   * Installs or updates static managed workflows in one pass: one read, then `_bulk` writes in
   * bounded chunks, one chunk at a time, each with one refresh. Follows the same rules as
   * {@link installManagedWorkflow}. A failed item is reported and does not stop the others; the
   * call rejects only when the first read fails.
   */
  public async installManagedWorkflows(
    items: readonly ManagedWorkflowServiceInstallManyItem[],
    registeredPluginId: string
  ): Promise<ManagedWorkflowInstallManyResult> {
    const failed: ManagedWorkflowInstallFailure[] = [];
    const targets = this.resolveManagedInstallTargets(items, registeredPluginId, failed);
    if (targets.length === 0) {
      return { failed };
    }

    if (this.shouldAbortManagedWrite(`install of ${targets.length} workflow(s)`)) {
      this.markInstallIncomplete(registeredPluginId);
      return { failed };
    }

    for (const { id, workflowDocumentId, spaceId } of targets) {
      this.trackInstall(registeredPluginId, id, workflowDocumentId, spaceId);
    }

    const isStartupWindow = !this.readyPluginIds.has(registeredPluginId);
    const now = new Date();
    let pending = targets;
    for (let attempt = 0; pending.length > 0; attempt++) {
      if (attempt > 0) {
        if (attempt > MAX_MANAGED_INSTALL_RETRIES) {
          for (const target of pending) {
            failed.push(
              this.toInstallFailure(
                target,
                new WorkflowConflictError(
                  `Workflow with id '${target.workflowDocumentId}' was updated concurrently. Please retry.`,
                  target.workflowDocumentId
                )
              )
            );
          }
          break;
        }
        this.logger.debug(
          `Managed workflows: retrying install of ${pending.length} workflow(s) after concurrent update conflicts`
        );
        await delayMs(DEFAULT_RETRY_DELAY_MS);
      }

      let storedById: Map<string, VersionedWorkflowDocument>;
      try {
        storedById = await this.deps.crudService.getWorkflowDocumentsWithVersionByIds(
          pending.map(({ workflowDocumentId }) => workflowDocumentId)
        );
      } catch (error) {
        if (attempt === 0) {
          throw error;
        }
        failed.push(...pending.map((target) => this.toInstallFailure(target, error)));
        break;
      }

      const writes = await this.prepareManagedInstallWrites({
        targets: pending,
        storedById,
        isStartupWindow,
        now,
        failed,
      });
      const { conflicted, aborted } = await this.writeManagedInstallChunks({
        writes,
        registeredPluginId,
        now,
        failed,
      });
      if (aborted) {
        break;
      }
      pending = conflicted;
    }

    return { failed };
  }

  private resolveManagedInstallTargets(
    items: readonly ManagedWorkflowServiceInstallManyItem[],
    registeredPluginId: string,
    failed: ManagedWorkflowInstallFailure[]
  ): ManagedInstallTarget[] {
    const targets: ManagedInstallTarget[] = [];
    const workflowDocumentIds = new Set<string>();
    for (const item of items) {
      try {
        const { definition, workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
          item.id,
          item,
          registeredPluginId
        );
        if (definition.management.lifecycle !== 'static') {
          throw new Error(
            `Managed workflow '${item.id}' is dynamic. Install it with install(), one workflow at a time.`
          );
        }
        // Workflow ids are unique across spaces, so a second write to the same id would conflict.
        if (workflowDocumentIds.has(workflowDocumentId)) {
          throw new Error(
            `Managed workflow '${item.id}' as '${workflowDocumentId}' appears more than once in the batch`
          );
        }
        workflowDocumentIds.add(workflowDocumentId);
        targets.push({
          id: item.id,
          definition,
          workflowDocumentId,
          spaceId,
          definitionHash: this.computeManagedDefinitionHash(definition),
          values: item.values,
        });
      } catch (error) {
        failed.push({ id: item.id, spaceId: item.spaceId, error: toError(error) });
      }
    }
    return targets;
  }

  /** Builds the documents that changed, yielding to the event loop after each one. */
  private async prepareManagedInstallWrites({
    targets,
    storedById,
    isStartupWindow,
    now,
    failed,
  }: {
    targets: readonly ManagedInstallTarget[];
    storedById: ReadonlyMap<string, VersionedWorkflowDocument>;
    isStartupWindow: boolean;
    now: Date;
    failed: ManagedWorkflowInstallFailure[];
  }): Promise<ManagedInstallWrite[]> {
    const writes: ManagedInstallWrite[] = [];
    for (const target of targets) {
      try {
        const write = await this.prepareManagedInstallWrite({
          target,
          stored: storedById.get(target.workflowDocumentId),
          isStartupWindow,
          now,
        });
        if (write) {
          writes.push(write);
          await yieldToEventLoop();
        }
      } catch (error) {
        failed.push(this.toInstallFailure(target, error));
      }
    }
    return writes;
  }

  private async prepareManagedInstallWrite({
    target,
    stored,
    isStartupWindow,
    now,
  }: {
    target: ManagedInstallTarget;
    stored: VersionedWorkflowDocument | undefined;
    isStartupWindow: boolean;
    now: Date;
  }): Promise<ManagedInstallWrite | undefined> {
    const { id, definition, workflowDocumentId, spaceId, definitionHash, values } = target;
    // The read covers all spaces and deleted documents; install() only sees live ones in its space.
    if (stored && (stored.source.spaceId !== spaceId || stored.source.deleted_at != null)) {
      throw new Error(
        `Cannot install managed workflow '${id}' as '${workflowDocumentId}' because a workflow with the same id is deleted or exists in another space`
      );
    }

    const plan = this.planManagedInstall({
      id,
      definition,
      workflowDocumentId,
      definitionHash,
      values,
      stored,
      isStartupWindow,
    });
    if (plan.action === 'skip') {
      return undefined;
    }

    const previous = plan.action === 'update' ? plan.stored : undefined;
    const document = await this.buildManagedInstallDocument({
      definition,
      workflowDocumentId,
      yaml: plan.yaml,
      managedTemplateValues: plan.managedTemplateValues,
      definitionHash,
      spaceId,
      now,
      existing: previous?.source,
    });
    // Static workflows install without a user request, and a binding can only change with one.
    if (document.definition?.settings?.run_as || previous?.source.definition?.settings?.run_as) {
      throw new Error(
        `Managed workflow '${id}' as '${workflowDocumentId}' is bound to a service account (settings.run_as). Static workflows cannot be bound, because a binding needs a user request.`
      );
    }
    return { target, document, stored: previous };
  }

  /**
   * Writes one chunk at a time. Returns the targets that lost a concurrent write, and whether
   * Kibana started stopping before every chunk was written.
   */
  private async writeManagedInstallChunks({
    writes,
    registeredPluginId,
    now,
    failed,
  }: {
    writes: readonly ManagedInstallWrite[];
    registeredPluginId: string;
    now: Date;
    failed: ManagedWorkflowInstallFailure[];
  }): Promise<{ conflicted: ManagedInstallTarget[]; aborted: boolean }> {
    const chunks = chunkByCountAndBytes(writes, {
      maxCount: MANAGED_INSTALL_BULK_MAX_DOCUMENTS,
      maxBytes: MANAGED_INSTALL_BULK_MAX_BYTES,
      getBytes: ({ document }) => Buffer.byteLength(JSON.stringify(document)),
    });
    const conflicted: ManagedInstallTarget[] = [];

    for (const [chunkIndex, chunk] of chunks.entries()) {
      if (this.shouldAbortManagedWrite(`install of ${chunk.length} workflow(s)`)) {
        // Same as install(): untrack creates that never ran, keep updates tracked, and mark the
        // pass incomplete so ready() skips orphan cleanup this boot.
        for (const { target, stored } of chunks.slice(chunkIndex).flat()) {
          if (!stored) {
            this.untrackInstall(registeredPluginId, target.workflowDocumentId, target.spaceId);
          }
        }
        this.markInstallIncomplete(registeredPluginId);
        return { conflicted, aborted: true };
      }

      await this.writeManagedInstallChunk({ chunk, now, failed, conflicted });
    }

    return { conflicted, aborted: false };
  }

  /** Writes one chunk with one `_bulk` request. A failed request fails only this chunk's workflows. */
  private async writeManagedInstallChunk({
    chunk,
    now,
    failed,
    conflicted,
  }: {
    chunk: readonly ManagedInstallWrite[];
    now: Date;
    failed: ManagedWorkflowInstallFailure[];
    conflicted: ManagedInstallTarget[];
  }): Promise<void> {
    let results: WorkflowDocumentBulkWriteResult[];
    try {
      results = await this.deps.crudService.bulkWriteWorkflowDocuments(
        chunk.map(({ target, document, stored }) => ({
          id: target.workflowDocumentId,
          document,
          previous: stored,
        }))
      );
    } catch (error) {
      failed.push(...chunk.map(({ target }) => this.toInstallFailure(target, error)));
      return;
    }

    const written: ManagedInstallWrite[] = [];
    for (const [index, write] of chunk.entries()) {
      const result = results[index];
      if (result.status === 'written') {
        written.push(write);
      } else if (result.status === 'conflict') {
        conflicted.push(write.target);
      } else {
        failed.push(this.toInstallFailure(write.target, result.error));
      }
    }
    await this.recordManagedInstallWrites(written, now);
  }

  /** Logs change history once per space for the chunk, and audits each workflow as install() does. */
  private async recordManagedInstallWrites(
    written: readonly ManagedInstallWrite[],
    now: Date
  ): Promise<void> {
    const historyBySpace = new Map<string, Array<{ id: string; document: WorkflowProperties }>>();
    const historyActionById = new Map<string, WorkflowChangeHistoryActionType>();

    for (const { target, document, stored } of written) {
      const { definition, workflowDocumentId, spaceId } = target;
      if (!stored || document.version !== stored.source.version) {
        const workflows = historyBySpace.get(spaceId) ?? [];
        workflows.push({ id: workflowDocumentId, document });
        historyBySpace.set(spaceId, workflows);
        historyActionById.set(
          workflowDocumentId,
          stored
            ? WorkflowChangeHistoryAction.workflowUpdate
            : WorkflowChangeHistoryAction.workflowInstall
        );
      }

      const auditEvent = {
        id: workflowDocumentId,
        managed: true,
        originalWorkflowId: definition.id,
        ownerPlugin: definition.pluginId,
        spaceId,
      };
      if (stored) {
        this.deps.audit?.logWorkflowUpdated(undefined, { ...auditEvent, reason: 'reinstall' });
      } else {
        this.deps.audit?.logWorkflowCreated(undefined, { ...auditEvent, reason: 'install' });
      }
    }

    for (const [spaceId, workflows] of historyBySpace) {
      await this.deps.crudService.logWorkflowChangesAfterWrite({
        workflows,
        getAction: (workflowId) =>
          historyActionById.get(workflowId) ?? WorkflowChangeHistoryAction.workflowUpdate,
        spaceId,
        timestamp: now,
      });
    }
  }

  private toInstallFailure(
    { id, workflowDocumentId, spaceId }: ManagedInstallTarget,
    error: unknown
  ): ManagedWorkflowInstallFailure {
    return { id, workflowId: workflowDocumentId, spaceId, error: toError(error) };
  }

  public async uninstallManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string,
    request?: KibanaRequest
  ): Promise<void> {
    const { workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
      id,
      options,
      registeredPluginId
    );
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

    await this.deps.crudService.deleteWorkflows(
      [workflowDocumentId],
      spaceId,
      { force: true },
      request
    );
    this.deps.audit?.logWorkflowDeleted(request, {
      id: workflowDocumentId,
      force: true,
      managed: true,
      originalWorkflowId: existing.originManagedWorkflowId,
      ownerPlugin: existing.managedBy,
      spaceId,
      reason: 'uninstall',
    });
  }

  /** Switches an owned managed workflow off without a request and resolves to whether this call did. */
  public async disableManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string
  ): Promise<boolean> {
    const { definition, workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
      id,
      options,
      registeredPluginId
    );
    const document = await this.deps.crudService.disableManagedWorkflowWithoutRequest(
      workflowDocumentId,
      spaceId,
      {
        managedBy: registeredPluginId,
        definitionId: id,
      }
    );
    if (!document) {
      return false;
    }
    await this.deps.crudService.logWorkflowChangesAfterWrite({
      workflows: [{ id: workflowDocumentId, document }],
      action: WorkflowChangeHistoryAction.workflowUpdate,
      spaceId,
      timestamp: new Date(),
    });
    this.deps.audit?.logWorkflowUpdated(undefined, {
      id: workflowDocumentId,
      managed: true,
      originalWorkflowId: definition.id,
      ownerPlugin: definition.pluginId,
      spaceId,
      reason: 'disable',
    });
    return true;
  }

  public async getManagedWorkflowStatus(
    id: ManagedWorkflowId,
    options: GetManagedWorkflowStatusOptions,
    registeredPluginId: string
  ): Promise<ManagedWorkflowStatusReport> {
    const { definition, workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
      id,
      options,
      registeredPluginId
    );
    const registryHash = this.computeManagedDefinitionHash(definition);
    const existing = await this.deps.crudService.getWorkflowDocumentSource(
      workflowDocumentId,
      spaceId,
      {
        includeDeleted: true,
        includeGlobal: true,
      }
    );

    if (!existing || existing.deleted_at) {
      return this.createManagedWorkflowStatusReport({
        status: 'missing',
        workflowDocumentId,
        definitionId: id,
        spaceId,
        definition,
        registryHash,
      });
    }

    if (existing.managed !== true) {
      return this.createManagedWorkflowStatusReport({
        status: 'not_managed',
        workflowDocumentId,
        definitionId: id,
        spaceId,
        definition,
        registryHash,
        existing,
      });
    }

    const storedHash = existing.definitionHash ?? null;
    const storedVersion = existing.managedVersion ?? null;
    let status: ManagedWorkflowStatus = 'intact';
    if (!existing.valid || !existing.definition) {
      status = 'invalid';
    } else if (!existing.enabled) {
      status = 'disabled';
    } else if (
      storedHash !== registryHash ||
      storedVersion !== definition.version ||
      existing.originManagedWorkflowId !== definition.id
    ) {
      status = 'drifted';
    }

    return this.createManagedWorkflowStatusReport({
      status,
      workflowDocumentId,
      definitionId: id,
      spaceId,
      definition,
      registryHash,
      existing,
    });
  }

  public async executeManagedWorkflow(
    id: ManagedWorkflowId,
    request: KibanaRequest,
    options: ExecuteManagedWorkflowOptions,
    registeredPluginId: string
  ): Promise<string> {
    const { workflowDocumentId, spaceId } = this.resolveOwnedManagedWorkflow(
      id,
      options,
      registeredPluginId
    );
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

    // This method starts the engine directly (like a parent's `workflow.execute`
    // step), so it bypasses the `runWorkflow` standalone gate. Refuse here too:
    // a delegating workflow has no identity of its own to run under.
    if (requiresDelegatedIdentity(existing)) {
      throw new WorkflowRequiresDelegatedIdentityError(
        `Managed workflow '${workflowDocumentId}' delegates its execution identity to a parent workflow and cannot be run standalone.`
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
      toWorkflowExecutionEngineModel(
        {
          id: workflowDocumentId,
          name: existing.name,
          enabled: existing.enabled,
          definition: existing.definition,
          yaml: existing.yaml,
          version: existing.version,
          managed: existing.managed,
          managedBy: existing.managedBy,
          originManagedWorkflowId: existing.originManagedWorkflowId,
          managedVersion: existing.managedVersion,
        },
        { spaceId }
      ),
      context,
      request
    );

    return response.workflowExecutionId;
  }

  /**
   * Per-plugin reconciliation triggered by ready().
   * Removes persisted static workflow documents that were NOT installed during the
   * startup window, and upgrades persisted dynamic auto workflow documents to the
   * current registry definition.
   *
   * Must not run destructive orphan cleanup when installs were gated out or aborted
   * incomplete this boot — `installedDocKeys` is only correct if the install pass
   * completed. Dynamic auto upgrades do not depend on that set and still run once
   * ready() has already passed Elasticsearch readiness.
   */
  private async reconcilePluginManagedWorkflows(pluginId: string): Promise<void> {
    const installPassIncomplete = this.incompleteInstallPluginIds.has(pluginId);
    if (installPassIncomplete) {
      this.logger.warn(
        `Managed workflows: skipping ready() orphan cleanup for plugin '${pluginId}' because ` +
          `one or more managed installs were incomplete this boot (gated or aborted). ` +
          `Persisted static workflows are preserved; missing installs retry on a later boot. ` +
          `Dynamic auto upgrades still run when Elasticsearch is ready.`
      );
    }

    const installedDocKeys = this.installedDocKeysByPlugin.get(pluginId) ?? new Set<string>();

    const pluginDefinitions = getManagedWorkflowDefinitions().filter(
      (d) => d.pluginId === pluginId
    );
    const staticDefinitionIds = new Set(
      pluginDefinitions.filter((d) => d.management.lifecycle === 'static').map((d) => d.id)
    );
    const autoDynamicDefinitionById = new Map(
      pluginDefinitions
        .filter(
          (d) => d.management.lifecycle === 'dynamic' && d.management.versionStrategy === 'auto'
        )
        .map((d) => [d.id, d])
    );

    if (staticDefinitionIds.size === 0 && autoDynamicDefinitionById.size === 0) {
      return;
    }

    const existingManagedDocs = await this.deps.crudService.getManagedWorkflowDocumentsAllSpaces({
      pluginId,
    });

    const orphanWorkflowsBySpace = new Map<
      string,
      Array<{ id: string; source: WorkflowProperties }>
    >();
    const dynamicUpdates: Array<{
      definitionId: ManagedWorkflowId;
      workflowId: string;
      spaceId: string;
    }> = [];
    for (const { id: docId, source } of existingManagedDocs) {
      const definitionId = source.originManagedWorkflowId;
      const isPluginStaticDoc = !!definitionId && staticDefinitionIds.has(definitionId);
      const autoDynamicDefinition = definitionId
        ? autoDynamicDefinitionById.get(definitionId)
        : undefined;
      const workflowSpaceId = source.spaceId ?? GLOBAL_WORKFLOW_SPACE_ID;

      if (!installPassIncomplete && isPluginStaticDoc) {
        const docKey = `${docId}:${workflowSpaceId}`;

        if (!installedDocKeys.has(docKey)) {
          const workflows = orphanWorkflowsBySpace.get(workflowSpaceId) ?? [];
          workflows.push({ id: docId, source });
          orphanWorkflowsBySpace.set(workflowSpaceId, workflows);
        }
      }

      if (autoDynamicDefinition) {
        dynamicUpdates.push({
          definitionId: autoDynamicDefinition.id as ManagedWorkflowId,
          workflowId: docId,
          spaceId: workflowSpaceId,
        });
      }
    }

    for (const [spaceId, orphanWorkflows] of orphanWorkflowsBySpace) {
      if (orphanWorkflows.length > 0) {
        this.logger.info(
          `Managed workflows: removing ${orphanWorkflows.length} orphaned static workflow(s) ` +
            `for plugin '${pluginId}' in space '${spaceId}'`
        );
        await this.forceDeleteOrphans(orphanWorkflows, spaceId, 'ready_reconciliation');
      }
    }

    if (installPassIncomplete && dynamicUpdates.length > 0) {
      this.logger.warn(
        `Managed workflows: running ${dynamicUpdates.length} dynamic auto upgrade(s) for plugin ` +
          `'${pluginId}' despite incomplete static installs this boot (orphan cleanup skipped).`
      );
    }

    for (const update of dynamicUpdates) {
      await this.installManagedWorkflow(
        update.definitionId,
        { workflowId: update.workflowId, spaceId: update.spaceId },
        pluginId
      );
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

  private async forceDeleteOrphans(
    orphanWorkflows: Array<{ id: string; source: WorkflowProperties }>,
    spaceId: string,
    reason: 'orphan_cleanup' | 'ready_reconciliation'
  ): Promise<void> {
    await pMap(
      orphanWorkflows,
      ({ id: workflowId, source }) => this.forceDeleteOrphan(workflowId, source, spaceId, reason),
      { concurrency: ORPHAN_DELETE_CONCURRENCY }
    );
  }

  private async forceDeleteOrphan(
    workflowId: string,
    source: WorkflowProperties,
    spaceId: string,
    reason: 'orphan_cleanup' | 'ready_reconciliation'
  ): Promise<void> {
    const orphan: ManagedWorkflowOrphan = {
      managedBy: source.managedBy ?? null,
      definitionId: source.originManagedWorkflowId ?? null,
    };
    let deleted = false;
    try {
      deleted = await this.deps.crudService.deleteManagedOrphan(workflowId, spaceId, orphan);
    } catch (error) {
      this.logger.error(
        `Managed workflows: failed to remove orphaned workflow '${workflowId}' in space '${spaceId}'`,
        { error }
      );
    }

    if (deleted) {
      this.deps.audit?.logWorkflowDeleted(undefined, {
        id: workflowId,
        force: true,
        managed: true,
        originalWorkflowId: source.originManagedWorkflowId,
        ownerPlugin: source.managedBy,
        spaceId,
        reason,
      });
    } else {
      await this.disableUndeletedOrphan(workflowId, spaceId, orphan);
    }
  }

  /** Stops new runs of an orphan that could not be deleted, so a later sweep can remove it. */
  private async disableUndeletedOrphan(
    workflowId: string,
    spaceId: string,
    orphan: ManagedWorkflowOrphan
  ): Promise<void> {
    try {
      await this.deps.crudService.disableManagedWorkflowWithoutRequest(workflowId, spaceId, orphan);
    } catch (error) {
      this.logger.error(
        `Managed workflows: failed to disable orphaned workflow '${workflowId}' in space '${spaceId}'`,
        { error }
      );
    }
  }

  private untrackInstall(pluginId: string, workflowDocumentId: string, spaceId: string): void {
    this.installedDocKeysByPlugin.get(pluginId)?.delete(`${workflowDocumentId}:${spaceId}`);
  }

  private applyManagedEnabledState(
    document: WorkflowProperties,
    enabled: boolean
  ): WorkflowProperties {
    return {
      ...document,
      enabled,
      yaml: updateYamlField(document.yaml, 'enabled', enabled),
      definition: document.definition
        ? {
            ...document.definition,
            enabled,
          }
        : null,
    };
  }

  private createManagedWorkflowStatusReport(params: {
    status: ManagedWorkflowStatus;
    workflowDocumentId: string;
    definitionId: ManagedWorkflowId;
    spaceId: string;
    definition: ManagedWorkflowDefinition;
    registryHash: string;
    existing?: WorkflowProperties;
  }): ManagedWorkflowStatusReport {
    const {
      status,
      workflowDocumentId,
      definitionId,
      spaceId,
      definition,
      registryHash,
      existing,
    } = params;

    return {
      status,
      workflowId: workflowDocumentId,
      definitionId,
      spaceId: existing?.spaceId ?? spaceId,
      installed: Boolean(existing),
      enabled: existing?.enabled ?? null,
      valid: existing?.valid ?? null,
      managedBy: existing?.managedBy ?? null,
      storedVersion: existing?.managedVersion ?? null,
      registryVersion: definition.version,
      storedHash: existing?.definitionHash ?? null,
      registryHash,
    };
  }

  /** Decides whether an install creates, updates or keeps the stored document. */
  private planManagedInstall({
    id,
    definition,
    workflowDocumentId,
    definitionHash,
    values,
    stored,
    isStartupWindow,
  }: {
    id: ManagedWorkflowId;
    definition: ManagedWorkflowDefinition;
    workflowDocumentId: string;
    definitionHash: string;
    values?: ManagedWorkflowTemplateValues;
    stored?: VersionedWorkflowDocument;
    isStartupWindow: boolean;
  }): ManagedInstallPlan {
    const { yaml, managedTemplateValues } = this.resolveManagedWorkflowYaml({
      definition,
      values,
      existingTemplateValues: stored?.source.managedTemplateValues,
    });

    if (!stored) {
      return { action: 'create', yaml, managedTemplateValues };
    }

    const { source: existing } = stored;
    if (!existing.managed) {
      throw new Error(
        `Cannot install managed workflow '${id}' as '${workflowDocumentId}' because a user workflow with the same id already exists`
      );
    }

    // For unchanged definitions, preserve the current document as-is.
    // Enforced enablement is reapplied only when a managed update is installed.
    if (
      existing.definitionHash === definitionHash &&
      existing.managedVersion === definition.version &&
      this.areTemplateValuesEqual(existing.managedTemplateValues, managedTemplateValues)
    ) {
      return { action: 'skip' };
    }

    if (definition.management.versionStrategy === 'on_adopt' && isStartupWindow) {
      return { action: 'skip' };
    }

    return { action: 'update', yaml, managedTemplateValues, stored };
  }

  /** Builds the versioned document an install writes, keeping `enabled` and `created_at` on update. */
  private async buildManagedInstallDocument({
    existing,
    ...params
  }: {
    definition: ManagedWorkflowDefinition;
    workflowDocumentId: string;
    yaml: string;
    managedTemplateValues: ManagedWorkflowTemplateValues | null;
    definitionHash: string;
    spaceId: string;
    now: Date;
    existing?: WorkflowProperties;
  }): Promise<WorkflowProperties> {
    const document = await this.prepareManagedWorkflowDocument({
      ...params,
      ...(existing
        ? {
            enabled:
              params.definition.management.enablement === 'enforced' ? undefined : existing.enabled,
            createdAt: existing.created_at,
          }
        : {}),
    });
    return applyWorkflowVersion(document, existing);
  }

  private async prepareManagedWorkflowDocument(params: {
    definition: ManagedWorkflowDefinition;
    workflowDocumentId: string;
    yaml: string;
    managedTemplateValues: ManagedWorkflowTemplateValues | null;
    definitionHash: string;
    spaceId: string;
    now: Date;
    enabled?: boolean;
    createdAt?: string;
  }): Promise<WorkflowProperties> {
    const {
      definition,
      workflowDocumentId,
      yaml,
      managedTemplateValues,
      definitionHash,
      spaceId,
      now,
      enabled,
      createdAt,
    } = params;
    const { workflowData } = await this.deps.crudService.prepareWorkflowDocumentForStorage({
      id: workflowDocumentId,
      yaml,
      actor: MANAGED_WORKFLOW_SYSTEM_USER,
      lightweightValidation: true,
      now,
      spaceId,
    });

    const managedWorkflowData = {
      ...workflowData,
      managed: true,
      managedBy: definition.pluginId,
      billable: definition.billable,
      definitionHash,
      managedTemplateValues: managedTemplateValues as Record<string, unknown> | null,
      originManagedWorkflowId: definition.id,
      lifecycle: definition.management.lifecycle,
      managedVisibilityContexts: this.getManagedVisibilityContexts(definition),
      managedVersion: definition.version,
    };

    return {
      ...this.applyManagedEnabledState(managedWorkflowData, enabled ?? workflowData.enabled),
      ...(createdAt ? { created_at: createdAt } : {}),
    };
  }

  private resolveOwnedManagedWorkflow(
    id: ManagedWorkflowId,
    options: ManagedWorkflowOperationOptions,
    registeredPluginId: string
  ): { definition: ManagedWorkflowDefinition; workflowDocumentId: string; spaceId: string } {
    const definition = getManagedWorkflowDefinition(id);
    if (!definition) {
      throw new Error(`Unknown managed workflow id: ${id}`);
    }
    this.assertPluginRegistration(definition, registeredPluginId);
    return {
      definition,
      workflowDocumentId: this.resolveWorkflowDocumentId(id, options),
      spaceId: this.getRequiredSpaceId(options),
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
      const templateValues = values ?? existingTemplateValues;
      if (!templateValues || Object.keys(templateValues).length === 0) {
        throw new Error(
          `Managed workflow '${definition.id}' uses yamlTemplate but no template values were provided and none are persisted`
        );
      }
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

  private getManagedVisibilityContexts(definition: ManagedWorkflowDefinition): string[] {
    return getManagedWorkflowVisibilityContexts(definition.visibility);
  }
}
