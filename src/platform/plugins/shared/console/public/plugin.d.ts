import type { Plugin, CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { AppSetupUIPluginDependencies, AppStartUIPluginDependencies, ConsolePluginSetup, ConsolePluginStart, AppPluginSetupDependencies } from './types';
export declare class ConsoleUIPlugin implements Plugin<ConsolePluginSetup, ConsolePluginStart, AppSetupUIPluginDependencies, AppPluginSetupDependencies> {
    private ctx;
    private readonly autocompleteInfo;
    private _embeddableConsole;
    constructor(ctx: PluginInitializerContext);
    setup({ notifications, getStartServices, http }: CoreSetup<AppPluginSetupDependencies>, { devTools, home, share, usageCollection }: AppSetupUIPluginDependencies): ConsolePluginSetup;
    start(core: CoreStart, deps: AppStartUIPluginDependencies): ConsolePluginStart;
}
