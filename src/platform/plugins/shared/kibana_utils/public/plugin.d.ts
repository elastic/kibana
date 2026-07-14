import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
export type KibanaUtilsPublicSetup = undefined;
export type KibanaUtilsPublicStart = undefined;
export interface KibanaUtilsPublicSetupDependencies {
}
export interface KibanaUtilsPublicStartDependencies {
}
export declare class KibanaUtilsPublicPlugin implements Plugin<KibanaUtilsPublicSetup, KibanaUtilsPublicStart, KibanaUtilsPublicSetupDependencies, KibanaUtilsPublicStartDependencies> {
    setup(_core: CoreSetup): KibanaUtilsPublicSetup;
    start(_core: CoreStart): KibanaUtilsPublicStart;
    stop(): void;
}
