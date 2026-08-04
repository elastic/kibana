import type { RuleSpecificFlappingProperties, RulesSettingsFlapping } from '@kbn/alerting-types';
interface GetOnEnabledChangeParams {
    enabled: boolean;
    spaceFlappingSettings: RulesSettingsFlapping;
    flappingSettings?: RuleSpecificFlappingProperties | null;
    cachedFlappingSettings?: RuleSpecificFlappingProperties;
}
interface GetOnEnabledChangeResult {
    custom: boolean;
    flappingChange: RuleSpecificFlappingProperties | null;
    hide?: boolean;
}
export declare const getOnEnabledChange: ({ enabled, spaceFlappingSettings, flappingSettings, cachedFlappingSettings, }: GetOnEnabledChangeParams) => GetOnEnabledChangeResult;
export {};
