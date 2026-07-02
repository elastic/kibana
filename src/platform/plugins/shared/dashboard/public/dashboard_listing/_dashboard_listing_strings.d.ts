import type { ViewMode } from '@kbn/presentation-publishing';
export declare const dashboardListingErrorStrings: {
    getErrorDeletingDashboardToast: () => string;
    getDuplicateTitleWarning: (value: string) => string;
};
export declare const getNewDashboardTitle: () => string;
export declare const dashboardListingTableStrings: {
    getEntityName: () => string;
    getEntityNamePlural: () => string;
    getTableListTitle: () => string;
};
export declare const noItemsStrings: {
    getReadonlyTitle: () => string;
    getReadonlyBody: () => string;
    getReadEditTitle: () => string;
    getReadEditInProgressTitle: () => string;
    getReadEditDashboardDescription: () => string;
    getSampleDataLinkText: () => string;
    getCreateNewDashboardText: () => string;
};
export declare const dashboardUnsavedListingStrings: {
    getUnsavedChangesTitle: (plural?: boolean) => string;
    getLoadingTitle: () => string;
    getEditAriaLabel: (title: string) => string;
    getEditTitle: () => string;
    getDiscardAriaLabel: (title: string) => string;
    getDiscardTitle: () => string;
};
export declare const resetConfirmStrings: {
    getResetTitle: () => string;
    getResetSubtitle: (viewMode: ViewMode) => string;
    getResetConfirmButtonText: () => string;
};
export declare const unsavedChangesConfirmStrings: {
    getUnsavedChangesTitle: () => string;
    getUnsavedChangesSubtitle: () => string;
    getCancelButtonLabel: () => string;
    getDiscardButtonText: () => string;
    getSaveButtonText: () => string;
};
export declare const createConfirmStrings: {
    getCreateTitle: () => string;
    getCreateSubtitle: () => string;
    getStartOverButtonText: () => string;
    getContinueButtonText: () => string;
    getCancelButtonText: () => string;
};
