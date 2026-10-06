import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataViewsPublicPluginSetup, DataViewsPublicPluginStart, DataViewsPublicSetupDependencies, DataViewsPublicStartDependencies } from './types';
export declare class DataViewsPublicPlugin implements Plugin<DataViewsPublicPluginSetup, DataViewsPublicPluginStart, DataViewsPublicSetupDependencies, DataViewsPublicStartDependencies> {
    private readonly initializerContext;
    private readonly hasData;
    private rollupsEnabled;
    private readonly callResolveCluster;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<DataViewsPublicStartDependencies, DataViewsPublicPluginStart>, { expressions, contentManagement }: DataViewsPublicSetupDependencies): DataViewsPublicPluginSetup;
    start(core: CoreStart, { fieldFormats, contentManagement, cps }: DataViewsPublicStartDependencies): DataViewsPublicPluginStart;
    stop(): void;
}
