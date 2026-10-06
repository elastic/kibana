export declare const EMPTY_LABEL: string;
export declare const NULL_LABEL: string;
/**
 * Displayed in place of a null value in tables and Discover, where a tooltip can carry the
 * meaning. Not translated: a dash is locale-independent.
 *
 * Named `NULL_PLACEHOLDER` (rather than `NULL_TOKEN`) to make the distinction from
 * `MISSING_TOKEN` explicit: `MISSING_TOKEN` is an internal sentinel used to mark absent
 * values in aggregation flows, whereas this constant is user-facing UI text.
 */
export declare const NULL_PLACEHOLDER = "-";
export declare const NAN_LABEL = "NaN";
export declare const MISSING_TOKEN = "__missing__";
