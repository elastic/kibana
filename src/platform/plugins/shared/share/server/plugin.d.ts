import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ServerUrlService } from './url_service';
/** @public */
export interface SharePublicSetup {
    url: ServerUrlService;
}
/** @public */
export interface SharePublicStart {
    url: ServerUrlService;
}
export interface SharePublicSetupDependencies {
    taskManager?: TaskManagerSetupContract;
}
export interface SharePublicStartDependencies {
    taskManager?: TaskManagerStartContract;
}
export declare class SharePlugin implements Plugin<SharePublicSetup, SharePublicStart, SharePublicSetupDependencies, SharePublicStartDependencies> {
    private readonly initializerContext;
    private url?;
    private readonly version;
    private readonly logger;
    private readonly config;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, { taskManager }: SharePublicSetupDependencies): {
        url: ServerUrlService;
    };
    start(_core: CoreStart, { taskManager }: SharePublicStartDependencies): {
        url: ServerUrlService;
    };
    stop(): void;
}
