import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { NavigationPublicSetup, NavigationPublicStart, NavigationPublicSetupDependencies, NavigationPublicStartDependencies } from './types';
export declare class NavigationPublicPlugin implements Plugin<NavigationPublicSetup, NavigationPublicStart, NavigationPublicSetupDependencies, NavigationPublicStartDependencies> {
    private initializerContext;
    private readonly topNavMenuExtensionsRegistry;
    private readonly stop$;
    private readonly solutionNavDefinitions;
    private chrome?;
    private activeSolutionId;
    private isSolutionNavEnabled;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, deps: NavigationPublicSetupDependencies): NavigationPublicSetup;
    start(core: CoreStart, depsStart: NavigationPublicStartDependencies): NavigationPublicStart;
    stop(): void;
    private addSolutionNavigation;
    private tryInitNavigation;
    private initiateChromeStyleAndSideNav;
    private getIsUnauthenticated;
}
