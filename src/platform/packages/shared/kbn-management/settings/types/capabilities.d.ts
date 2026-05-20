export interface SettingsCapabilities {
    spaceSettings: SettingCapability;
    globalSettings: SettingCapability;
    filterSettings: FilterCapability;
}
interface SettingCapability {
    show: boolean;
    save: boolean;
}
interface FilterCapability {
    bySolutionView: boolean;
}
export {};
