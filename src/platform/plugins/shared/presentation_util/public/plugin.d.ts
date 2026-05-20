import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { PresentationUtilPluginSetup, PresentationUtilPluginSetupDeps, PresentationUtilPluginStart, PresentationUtilPluginStartDeps } from './types';
export declare class PresentationUtilPlugin implements Plugin<PresentationUtilPluginSetup, PresentationUtilPluginStart, PresentationUtilPluginSetupDeps, PresentationUtilPluginStartDeps> {
    setup(_coreSetup: CoreSetup<PresentationUtilPluginStartDeps, PresentationUtilPluginStart>, _setupPlugins: PresentationUtilPluginSetupDeps): PresentationUtilPluginSetup;
    start(coreStart: CoreStart, startPlugins: PresentationUtilPluginStartDeps): PresentationUtilPluginStart;
    stop(): void;
}
