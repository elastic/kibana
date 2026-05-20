import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CustomIntegrationsSetup, CustomIntegrationsStart, CustomIntegrationsStartDependencies } from './types';
export declare class CustomIntegrationsPlugin implements Plugin<CustomIntegrationsSetup, CustomIntegrationsStart> {
    setup(core: CoreSetup): CustomIntegrationsSetup;
    start(coreStart: CoreStart, startPlugins: CustomIntegrationsStartDependencies): CustomIntegrationsStart;
    stop(): void;
}
