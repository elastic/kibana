/**
 * `data-test-subj` values owned by the app header, shared between the components and test consumers
 * to prevent drift. Covers the structural slots and the static menu items the header injects
 * (documentation, feedback, add integrations); caller-provided tabs, badges, and `menu` items are not.
 */
export declare const APP_HEADER_TEST_SUBJECTS: {
    readonly root: "appHeader";
    readonly title: "appHeaderTitle";
    readonly titleInput: "appHeaderTitleInput";
    readonly titleError: "appHeaderTitleError";
    readonly titleButton: "appHeaderTitleButton";
    readonly titleActions: "appHeaderTitleActions";
    readonly sharePrefix: "appHeaderShare";
    readonly favorite: "appHeaderFavorite";
    readonly metadata: "appHeaderMetadata";
    readonly tabs: "appHeaderTabs";
    readonly badgesOverflow: "appHeaderBadgesOverflow";
    readonly back: "appHeaderBack";
    readonly menuDocumentation: "appHeaderMenuDocumentation";
    readonly menuFeedback: "appHeaderMenuFeedback";
    readonly menuAddIntegrations: "appHeaderMenuAddIntegrations";
};
