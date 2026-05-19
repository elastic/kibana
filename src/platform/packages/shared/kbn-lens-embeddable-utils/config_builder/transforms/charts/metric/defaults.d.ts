/**
 * Lens-known defaults for Metric chart styling.
 *
 * These are the values Lens applies at runtime when the corresponding
 * property is omitted.  We surface them explicitly in API responses
 * ("complete-out" contract) so the caller receives a fully reproducible
 * chart definition that does not depend on runtime defaults.
 */
export declare const DEFAULT_PRIMARY_POSITION: "bottom";
export declare const DEFAULT_PRIMARY_LABELS_ALIGNMENT: "left";
export declare const DEFAULT_PRIMARY_VALUE_ALIGNMENT: "right";
export declare const DEFAULT_PRIMARY_VALUE_SIZING: "auto";
export declare const DEFAULT_PRIMARY_ICON_ALIGNMENT: "right";
export declare const DEFAULT_SECONDARY_LABEL_VISIBLE = true;
export declare const DEFAULT_SECONDARY_LABEL_PLACEMENT: "before";
export declare const DEFAULT_SECONDARY_VALUE_ALIGNMENT: "right";
export declare const DEFAULT_SECONDARY_COMPARE_TO_PALETTE: "compare_to";
