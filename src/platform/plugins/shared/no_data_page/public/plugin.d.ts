import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { NoDataPagePublicSetup, NoDataPagePublicStart } from './types';
import type { NoDataPageConfig } from '../server/config';
export declare class NoDataPagePlugin implements Plugin<NoDataPagePublicSetup, NoDataPagePublicStart> {
    private initializerContext;
    constructor(initializerContext: PluginInitializerContext<NoDataPageConfig>);
    setup(_core: CoreSetup): NoDataPagePublicSetup;
    start(_core: CoreStart): NoDataPagePublicStart;
}
