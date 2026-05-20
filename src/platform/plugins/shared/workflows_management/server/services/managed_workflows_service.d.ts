import type { KibanaRequest, Logger } from '@kbn/core/server';
import { type ManagedWorkflowId } from '@kbn/workflows/managed';
import type { ExecuteManagedWorkflowOptions, ManagedWorkflowOperationOptions } from '@kbn/workflows/server/types';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowCrudService } from './workflow_crud_service';
interface ManagedWorkflowsServiceDeps {
    crudService: WorkflowCrudService;
    workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
    logger: Logger;
}
export declare class ManagedWorkflowsService {
    private readonly deps;
    private readonly readyPluginIds;
    /**
     * Tracks every static workflow installed during the startup window, keyed by plugin ID.
     * Each entry is a composite key of `${workflowDocumentId}:${spaceId}` — this captures
     * both the suffix variation and the target space so that reconciliation can detect
     * individual instances that were not re-installed across restarts.
     */
    private readonly installedDocKeysByPlugin;
    private readonly logger;
    constructor(deps: ManagedWorkflowsServiceDeps);
    isPluginReady(pluginId: string): boolean;
    /**
     * Called when a plugin signals it has finished installing all its static workflows.
     * Triggers per-plugin reconciliation: removes persisted static workflows that were
     * not installed during the startup window and upgrades dynamic auto workflows.
     */
    pluginReady(pluginId: string): Promise<void>;
    /**
     * Global cleanup for workflows whose owner plugin is no longer registered
     * or whose definition no longer exists in the registry.
     * Safe to run immediately at start — no dependency on install() calls.
     */
    cleanupUnregisteredOrphans(registeredOwnerPluginIds: string[]): Promise<void>;
    installManagedWorkflow(id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions, registeredPluginId: string): Promise<void>;
    private installManagedWorkflowOnce;
    uninstallManagedWorkflow(id: ManagedWorkflowId, options: ManagedWorkflowOperationOptions, registeredPluginId: string): Promise<void>;
    executeManagedWorkflow(id: ManagedWorkflowId, request: KibanaRequest, options: ExecuteManagedWorkflowOptions, registeredPluginId: string): Promise<string>;
    /**
     * Per-plugin reconciliation triggered by ready().
     * Removes persisted static workflow documents that were NOT installed during the
     * startup window, and upgrades persisted dynamic auto workflow documents to the
     * current registry definition.
     */
    private reconcilePluginManagedWorkflows;
    private trackInstall;
    private applyManagedEnabledState;
    private prepareManagedWorkflowDocument;
    private assertPluginRegistration;
    private resolveWorkflowDocumentId;
    private getRequiredSpaceId;
    private resolveManagedWorkflowYaml;
    private computeManagedDefinitionHash;
    private areTemplateValuesEqual;
}
export {};
