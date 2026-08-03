import type { CoreStart, Plugin } from '@kbn/core/public';
import type { ApmSharedPluginSetup, ApmSharedPluginStart, ApmSharedPluginStartDeps } from './types';
export declare class ApmSharedPlugin implements Plugin<ApmSharedPluginSetup, ApmSharedPluginStart, {}, ApmSharedPluginStartDeps> {
    setup(): ApmSharedPluginSetup;
    start(core: CoreStart, { cps }: ApmSharedPluginStartDeps): ApmSharedPluginStart;
    stop(): void;
}
