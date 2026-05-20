import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { WorkflowsManagementApi } from './api/workflows_management_api';
import type { WorkflowsManagementConfig } from './config';
import type { WorkflowsServerPluginSetup, WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStart, WorkflowsServerPluginStartDeps } from './types';
export declare class WorkflowsPlugin implements Plugin<WorkflowsServerPluginSetup, WorkflowsServerPluginStart, WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStartDeps> {
    private readonly logger;
    private config;
    private availabilityUpdater;
    private api;
    private workflowsService;
    constructor(initializerContext: PluginInitializerContext<WorkflowsManagementConfig>);
    setup(core: CoreSetup<WorkflowsServerPluginStartDeps>, plugins: WorkflowsServerPluginSetupDeps): {
        management: WorkflowsManagementApi;
    };
    start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps): {};
    private runGlobalOrphanCleanup;
    stop(): void;
}
