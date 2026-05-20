/**
 * EBT click action name constants.
 *
 * These values populate the `data-ebt-action` HTML attribute and map to the
 * `click.action` field in EBT click events.
 *
 * ## Naming convention: intent over implementation
 *
 * Action names must express what the user *intends* to do, not what the UI does
 * underneath. For example, a link that currently opens an error in Discover should
 * be named `viewError`, not `openInDiscover` — because if the destination changes
 * tomorrow (e.g. to APM or a flyout), the user intent is still "view the error"
 * and we should not need to update every call site.
 *
 * Use `openInDiscover` only when the user explicitly chooses to open something in
 * Discover (e.g. a button that says "Open in Discover").
 */
/**
 * Shared EBT click action constants.
 *
 * Use these when the user intent is generic enough to be shared across plugins.
 * For plugin-specific actions, define them locally in the plugin's own ebt_constants file.
 */
export declare const EBT_CLICK_ACTIONS: {
    /** Navigates to the Discover app. */
    readonly OPEN_IN_DISCOVER: "openInDiscover";
    /** User intends to view a span or transaction's details. */
    readonly VIEW_SPAN: "viewSpan";
    /** User intends to view a service's overview. */
    readonly VIEW_SERVICE: "viewService";
    /** User intends to view an error's details. */
    readonly VIEW_ERROR: "viewError";
    /** Navigates to the APM app. Use when the user explicitly chooses to open something in APM. */
    readonly OPEN_IN_APM: "openInApm";
};
