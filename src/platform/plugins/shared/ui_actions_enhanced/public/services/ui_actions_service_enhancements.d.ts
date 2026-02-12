import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ActionFactoryDefinition, BaseActionConfig, BaseActionFactoryContext } from '../dynamic_actions';
import { ActionFactory } from '../dynamic_actions';
import type { ActionFactoryRegistry } from '../types';
import type { DynamicActionsState } from '../../common/types';
export type { DynamicActionsState };
export interface UiActionsServiceEnhancementsParams {
    readonly actionFactories?: ActionFactoryRegistry;
    readonly getLicense?: () => ILicense;
    readonly featureUsageSetup?: LicensingPluginSetup['featureUsage'];
    readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'] | undefined;
}
export declare class UiActionsServiceEnhancements {
    protected readonly actionFactories: ActionFactoryRegistry;
    protected readonly deps: Omit<UiActionsServiceEnhancementsParams, 'actionFactories'>;
    constructor({ actionFactories, ...deps }: UiActionsServiceEnhancementsParams);
    /**
     * Register an action factory. Action factories are used to configure and
     * serialize/deserialize dynamic actions.
     */
    readonly registerActionFactory: <Config extends BaseActionConfig = BaseActionConfig, ExecutionContext extends object = object, FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext>(definition: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>) => void;
    readonly getActionFactory: (actionFactoryId: string) => ActionFactory;
    readonly hasActionFactory: (actionFactoryId: string) => boolean;
    /**
     * Returns an array of all action factories.
     */
    readonly getActionFactories: () => ActionFactory[];
    private registerFeatureUsage;
}
