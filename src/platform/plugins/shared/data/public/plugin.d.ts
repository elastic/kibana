import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ConfigSchema } from '../server/config';
import type { DataPublicPluginSetup, DataPublicPluginStart, DataSetupDependencies, DataStartDependencies } from './types';
export declare class DataPublicPlugin implements Plugin<DataPublicPluginSetup, DataPublicPluginStart, DataSetupDependencies, DataStartDependencies> {
    private readonly searchService;
    private readonly queryService;
    private readonly storage;
    private readonly nowProvider;
    constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
    setup(core: CoreSetup<DataStartDependencies, DataPublicPluginStart>, { expressions, uiActions, usageCollection, inspector, fieldFormats, management, }: DataSetupDependencies): DataPublicPluginSetup;
    start(core: CoreStart, { uiActions, fieldFormats, dataViews, inspector, screenshotMode, share, cps, }: DataStartDependencies): DataPublicPluginStart;
    stop(): void;
}
