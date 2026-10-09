export interface RulesSettingsModificationMetadata {
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface RulesSettingsFlappingProperties {
    enabled: boolean;
    lookBackWindow: number;
    statusChangeThreshold: number;
}
export interface RuleSpecificFlappingProperties {
    enabled?: boolean;
    lookBackWindow: number;
    statusChangeThreshold: number;
}
export type RulesSettingsFlapping = RulesSettingsFlappingProperties & RulesSettingsModificationMetadata;
export interface RulesSettingsQueryDelayProperties {
    delay: number;
}
export type RulesSettingsQueryDelay = RulesSettingsQueryDelayProperties & RulesSettingsModificationMetadata;
export interface RulesSettingsAlertDeleteProperties {
    isActiveAlertDeleteEnabled: boolean;
    isInactiveAlertDeleteEnabled: boolean;
    activeAlertDeleteThreshold: number;
    inactiveAlertDeleteThreshold: number;
    categoryIds: Array<'securitySolution' | 'observability' | 'management'>;
    spaceIds?: string[];
}
export interface RulesSettingsProperties {
    flapping?: RulesSettingsFlappingProperties;
    queryDelay?: RulesSettingsQueryDelayProperties;
}
export interface RulesSettings {
    flapping?: RulesSettingsFlapping;
    queryDelay?: RulesSettingsQueryDelay;
}
