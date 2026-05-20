interface PresentationCapabilities {
    canAccessDashboards: boolean;
    canCreateNewDashboards: boolean;
    canSaveVisualizations: boolean;
    canSetAdvancedSettings: boolean;
}
export declare const getPresentationCapabilities: () => PresentationCapabilities;
export {};
