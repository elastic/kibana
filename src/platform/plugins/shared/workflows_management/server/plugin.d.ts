import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup, WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStart, WorkflowsServerPluginStartDeps } from './types';
import { WorkflowsManagementApi } from './workflows_management/workflows_management_api';
export declare class WorkflowsPlugin implements Plugin<WorkflowsServerPluginSetup, WorkflowsServerPluginStart, WorkflowsServerPluginSetupDeps, WorkflowsServerPluginStartDeps> {
    private readonly logger;
    private workflowsService;
    private workflowTaskScheduler;
    private api;
    private spaces?;
    private triggerEventsClient;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<WorkflowsServerPluginStartDeps>, plugins: WorkflowsServerPluginSetupDeps): {
        management: WorkflowsManagementApi;
    };
    start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps): {};
    private initializeTriggerEventsClient;
    stop(): void;
}
