import type { FC } from 'react';
import type { CollectConfigProps } from '@kbn/kibana-utils-plugin/public';
import type { MigrateFunctionsObject, GetMigrationFunctionObjectFn } from '@kbn/kibana-utils-plugin/common';
import type { UiActionsPresentable as Presentable, ActionMenuItemProps } from '@kbn/ui-actions-plugin/public';
import type { Configurable } from '@kbn/kibana-utils-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { SavedObjectReference } from '@kbn/core/types';
import type { PersistableState } from '@kbn/kibana-utils-plugin/common';
import type { BaseActionConfig, BaseActionFactoryContext, SerializedAction, SerializedEvent } from './types';
import type { ActionFactoryDefinition } from './action_factory_definition';
export interface ActionFactoryDeps {
    readonly getLicense?: () => ILicense;
    readonly getFeatureUsageStart: () => LicensingPluginStart['featureUsage'] | undefined;
}
export declare class ActionFactory<Config extends BaseActionConfig = BaseActionConfig, ExecutionContext extends object = object, FactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext> implements Omit<Presentable<FactoryContext>, 'getHref'>, Configurable<Config, FactoryContext>, PersistableState<SerializedEvent> {
    protected readonly def: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>;
    protected readonly deps: ActionFactoryDeps;
    readonly id: string;
    readonly isBeta: boolean;
    readonly minimalLicense?: LicenseType;
    readonly licenseFeatureName?: string;
    readonly order: number;
    readonly MenuItem?: FC<ActionMenuItemProps<any>>;
    readonly CollectConfig: FC<CollectConfigProps<Config, FactoryContext>>;
    readonly createConfig: (context: FactoryContext) => Config;
    readonly isConfigValid: (config: Config, context: FactoryContext) => boolean;
    readonly migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
    constructor(def: ActionFactoryDefinition<Config, ExecutionContext, FactoryContext>, deps: ActionFactoryDeps);
    getIconType(context: FactoryContext): string | undefined;
    getDisplayName(context: FactoryContext): string;
    getDisplayNameTooltip(context: FactoryContext): string;
    isCompatible(context: FactoryContext): Promise<boolean>;
    /**
     * Does this action factory license requirements
     * compatible with current license?
     */
    isCompatibleLicense(): boolean;
    create(serializedAction: Omit<SerializedAction<Config>, 'factoryId'>): ActionDefinition<ExecutionContext>;
    supportedTriggers(): string[];
    private notifyFeatureUsage;
    telemetry(state: SerializedEvent, telemetryData: Record<string, string | number | boolean>): Record<string, any>;
    extract(state: SerializedEvent): {
        state: SerializedEvent;
        references: SavedObjectReference[];
    };
    inject(state: SerializedEvent, references: SavedObjectReference[]): SerializedEvent;
}
