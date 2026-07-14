/**
 * Structural `data-test-subj` values the app menu renders by default, shared between the components
 * and test consumers to prevent drift. Subjects derived from a caller-provided `testId`/`id` use the
 * helpers below.
 */
export declare const APP_MENU_TEST_SUBJECTS: {
    readonly root: "app-menu";
    readonly overflowButton: "app-menu-overflow-button";
    readonly popover: "app-menu-popover";
    readonly switch: "app-menu-switch";
    readonly popoverActionButtonsContainer: "app-menu-popover-action-buttons-container";
    readonly notificationIndicator: "split-button-notification-indicator";
};
/** Default `data-test-subj` for a menu item without an explicit `testId`. */
export declare const getAppMenuItemTestSubj: (id: string) => string;
/** Default `data-test-subj` for an action button without an explicit `testId`. */
export declare const getAppMenuActionButtonTestSubj: (id: string) => string;
