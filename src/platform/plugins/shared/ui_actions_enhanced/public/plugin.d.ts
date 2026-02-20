import { BehaviorSubject } from 'rxjs';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import { UiActionsServiceEnhancements } from './services';
interface SetupDependencies {
    uiActions: UiActionsSetup;
    licensing?: LicensingPluginSetup;
}
export interface StartDependencies {
    uiActions: UiActionsStart;
    licensing?: LicensingPluginStart;
}
export type SetupContract = UiActionsSetup;
export interface StartContract extends UiActionsStart, Pick<UiActionsServiceEnhancements, 'getActionFactory' | 'hasActionFactory' | 'getActionFactories'> {
}
export declare class AdvancedUiActionsPublicPlugin implements Plugin<SetupContract, StartContract, SetupDependencies, StartDependencies> {
    readonly licenseInfo: BehaviorSubject<ILicense | undefined>;
    private getLicenseInfo;
    private enhancements?;
    private subs;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<StartDependencies>, { uiActions, licensing }: SetupDependencies): SetupContract;
    start(core: CoreStart, { uiActions, licensing }: StartDependencies): StartContract;
    stop(): void;
}
export {};
