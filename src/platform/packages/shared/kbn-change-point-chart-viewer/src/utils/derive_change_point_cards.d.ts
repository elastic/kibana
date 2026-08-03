import type { Datatable } from '@kbn/expressions-plugin/common';
export interface ChangePointCardModel {
    readonly id: string;
    readonly title: string;
    readonly lineEsql: string;
    /** The BY grouping column names when the query uses `CHANGE_POINT ... BY col[, col]`. */
    readonly byColumns?: readonly string[];
    readonly annotationEvents: Array<{
        name: string;
        datetime: string;
    }>;
    /**
     * The lowest (most significant) pvalue across all annotation events for this card.
     * Undefined when type/pvalue are absent from the result schema (e.g. BY mode with WHERE type IS NOT NULL).
     */
    readonly minPvalue?: number;
    /** Distinct change-point type strings present in this card's annotations (empty in BY mode). */
    readonly changePointTypes: readonly string[];
    /**
     * Column IDs used to identify change-point annotation rows in this result set.
     * Used by {@link getCardForRow} to determine whether a no-BY row is an actual
     * change point before returning the card.
     */
    readonly typeColumnId: string;
    readonly pvalueColumnId: string;
    /**
     * Serialized value of each entity-dimension column for this card (keyed by column ID).
     * Populated from entityColumnIds — covers both explicit BY columns and heuristic columns.
     * Empty object for no-split (single-series) cards.
     */
    readonly entityValues: Readonly<Record<string, string>>;
    /**
     * Human-readable "col: val" description of every entity dimension, e.g.
     * `"host: web-server-1, service: orders"`. Always uses `col: val` format (unlike `title`,
     * which omits the column name for single-column cards). `undefined` for no-split cards.
     * Suitable for use as a Lens panel description or case-attachment metadata.
     */
    readonly entityDescription: string | undefined;
}
export declare const formatAnnotationTimestamp: (value: unknown) => string | undefined;
export declare const buildChangePointCards: (params: {
    table: Datatable | undefined;
    esql: string;
}) => ChangePointCardModel[] | undefined;
/**
 * Finds the card in the given list that corresponds to a specific result row.
 * Returns `undefined` when no match is found (e.g. the row belongs to a group
 * that was filtered out by {@link buildChangePointCards}).
 */
export declare const getCardForRow: (cards: ChangePointCardModel[], row: Readonly<Record<string, unknown>>) => ChangePointCardModel | undefined;
