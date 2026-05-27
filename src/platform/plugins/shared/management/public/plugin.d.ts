import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ConfigSchema, ManagementSetup, ManagementStart, AutoOpsStatusHook } from './types';
interface ManagementSetupDependencies {
    home?: HomePublicPluginSetup;
    share: SharePluginSetup;
    cloud?: {
        isCloudEnabled: boolean;
        baseUrl?: string;
    };
}
interface ManagementStartDependencies {
    share: SharePluginStart;
    serverless?: ServerlessPluginStart;
    cloud?: {
        isCloudEnabled: boolean;
        baseUrl?: string;
    };
}
export declare class ManagementPlugin implements Plugin<ManagementSetup, ManagementStart, ManagementSetupDependencies, ManagementStartDependencies> {
    private initializerContext;
    private readonly managementSections;
    private readonly appUpdater;
    private hasAnyEnabledApps;
    private isSidebarEnabled$;
    private cardsNavigationConfig$;
    private autoOpsStatusHook?;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    private registerAutoOpsStatusHook;
    private getAutoOpsStatusHook;
    setup(core: CoreSetup<ManagementStartDependencies>, { home, share, cloud }: ManagementSetupDependencies): {
        sections: import("./types").SectionsServiceSetup;
        locator: import("@kbn/share-plugin/public").LocatorPublic<import("../common/locator").ManagementAppLocatorParams>;
        registerAutoOpsStatusHook: (hook: AutoOpsStatusHook) => void;
    };
    start(core: CoreStart, plugins: ManagementStartDependencies): ManagementStart;
}
export {};
