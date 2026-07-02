import type { ViewMode } from '@kbn/presentation-publishing';
export declare const getDashboardPageTitle: () => string;
export declare const dashboardReadonlyBadge: {
    getText: () => string;
    getTooltip: () => string;
};
export declare const dashboardManagedBadge: {
    getDuplicateButtonAriaLabel: () => string;
    getBadgeAriaLabel: () => string;
};
/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export declare function getDashboardTitle(title: string | undefined, viewMode: ViewMode, isNew: boolean): string;
export declare const unsavedChangesBadgeStrings: {
    getUnsavedChangedBadgeText: () => string;
    getUnsavedChangedBadgeToolTipContent: () => string;
};
export declare const getCreateVisualizationButtonTitle: () => string;
export declare const getQuickCreateButtonGroupLegend: () => string;
export declare const getNewDashboardTitle: () => string;
export declare const getPanelAddedSuccessString: (savedObjectName?: string) => string;
export declare const getPanelTooOldErrorString: () => string;
export declare const shareModalStrings: {
    getTopMenuCheckbox: () => string;
    getQueryCheckbox: () => string;
    getTimeFilterCheckbox: () => string;
    getFilterBarCheckbox: () => string;
    getCheckboxLegend: () => string;
    getSnapshotShareWarning: () => string;
    getDraftSharePanelChangesWarning: () => string;
    getEmbedSharePanelChangesWarning: () => string;
    getDraftShareWarning: (shareType: "embed" | "link") => string;
    accessModeUpdateSuccess: string;
    accessModeUpdateError: string;
    draftModeCalloutTitle: string;
    draftModeSaveButtonLabel: string;
};
export declare const getDashboardBreadcrumb: () => string;
export declare const topNavStrings: {
    fullScreen: {
        label: string;
        description: string;
    };
    labs: {
        label: string;
        description: string;
    };
    edit: {
        label: string;
        description: string;
        writeRestrictedTooltip: string;
        managedDashboardTooltip: string;
    };
    quickSave: {
        label: string;
        description: string;
    };
    editModeInteractiveSave: {
        label: string;
        description: string;
    };
    resetChanges: {
        label: string;
        description: string;
    };
    switchToViewMode: {
        label: string;
        description: string;
    };
    export: {
        label: string;
        description: string;
        jsonLabel: string;
        pngLabel: string;
        pdfLabel: string;
        scheduleExportLabel: string;
    };
    share: {
        label: string;
        description: string;
        tooltipTitle: string;
        writeRestrictedModeTooltipContent: string;
        editModeTooltipContent: string;
    };
    settings: {
        label: string;
        description: string;
    };
    viewModeInteractiveSave: {
        label: string;
        description: string;
    };
    add: {
        label: string;
        description: string;
    };
    backgroundSearch: {
        label: string;
        description: string;
    };
    saveMenu: {
        label: string;
        description: string;
    };
    unsavedChangesTooltip: string;
};
export declare const contentEditorFlyoutStrings: {
    readonlyReason: {
        accessControl: string;
        missingPrivileges: string;
        managedEntity: string;
    };
};
