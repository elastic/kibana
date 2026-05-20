import type { Logger } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { WorkflowsManagementApi } from '../api/workflows_management_api';
import type { WorkflowsManagementConfig } from '../config';
export interface AvailabilityUpdaterDeps {
    licensing: LicensingPluginStart;
    config: WorkflowsManagementConfig;
    api: WorkflowsManagementApi;
    logger: Logger;
}
/**
 * Disables and unschedule workflows when the instance is not workflows-available:
 * - `workflowsManagement.available` is false at startup (serverless config).
 * - License transitions from workflows-valid to workflows-invalid (e.g. downgrade below enterprise).
 */
export declare class AvailabilityUpdater {
    private readonly deps;
    private logger;
    private licenseSubscription?;
    constructor(deps: AvailabilityUpdaterDeps);
    private listen;
    stop(): void;
    private runConfigUnavailableDisable;
    private runLicenseDowngradeDisable;
}
