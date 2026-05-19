import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { UiActionsService } from './service';
export type UiActionsPublicSetup = Pick<UiActionsService, 'addTriggerActionAsync' | 'attachAction' | 'detachAction' | 'registerActionAsync' | 'unregisterAction'>;
export type UiActionsPublicStart = PublicMethodsOf<UiActionsService>;
export interface UiActionsPublicSetupDependencies {
}
export interface UiActionsPublicStartDependencies {
}
export declare class UiActionsPlugin implements Plugin<UiActionsPublicSetup, UiActionsPublicStart, UiActionsPublicSetupDependencies, UiActionsPublicStartDependencies> {
    private readonly service;
    constructor(_initializerContext: PluginInitializerContext);
    setup(_core: CoreSetup): UiActionsPublicSetup;
    start(core: CoreStart): UiActionsPublicStart;
    stop(): void;
}
