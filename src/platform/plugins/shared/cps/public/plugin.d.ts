import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CPSPluginSetup, CPSPluginStart, CPSPluginStartDependencies, CPSConfigType } from './types';
export declare class CpsPlugin implements Plugin<CPSPluginSetup, CPSPluginStart, {}, CPSPluginStartDependencies> {
    private readonly initializerContext;
    private readonly appAccessResolvers;
    constructor(initializerContext: PluginInitializerContext<CPSConfigType>);
    setup(core: CoreSetup): CPSPluginSetup;
    start(core: CoreStart, { cloud }?: CPSPluginStartDependencies): CPSPluginStart;
    stop(): void;
}
