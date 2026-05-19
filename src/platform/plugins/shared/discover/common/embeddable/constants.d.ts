/** Reference name used for the saved search saved object when the embeddable is by-reference */
export declare const SAVED_SEARCH_SAVED_OBJECT_REF_NAME = "savedObjectRef";
/**
 * Used for search embeddable transforms. The as-code API shape does not support tab id/label. When
 * transforming from the as-code API shape back to the stored shape, we use these synthetic values
 * to satisfy the stored shape/types.
 */
export declare const DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_ID = "discover_session_embeddable_synthetic_tab_id";
export declare const DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_LABEL = "discover_session_embeddable_synthetic_tab_label";
/** This constant refers to the parts of the saved search state that can be edited from a dashboard */
export declare const EDITABLE_SAVED_SEARCH_KEYS: readonly ["sort", "columns", "rowHeight", "sampleSize", "rowsPerPage", "headerRowHeight", "density", "grid"];
