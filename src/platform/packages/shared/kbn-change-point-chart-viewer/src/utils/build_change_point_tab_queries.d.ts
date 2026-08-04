import type { TimeRange } from '@kbn/data-plugin/common';
import type { ChangePointCardModel } from './derive_change_point_cards';
/**
 * Builds a raw-documents ESQL query for the focused Discover tab.
 *
 * Extracts the FROM source from lineEsql and appends WHERE predicates derived
 * from entityValues. The STATS / CHANGE_POINT pipeline is intentionally omitted
 * so Discover shows individual events rather than aggregated rows.
 *
 * Returns undefined when the FROM source cannot be extracted from the query.
 */
export declare const buildFocusedViewRawQuery: (lineEsql: string, entityValues: Readonly<Record<string, string>>) => string | undefined;
/**
 * Builds a focused time range centred on all of the card's change-point annotations.
 *
 * Both absolute ISO and relative bounds (e.g. "now-30d") are resolved to milliseconds
 * via datemath before computing the focused window. The window spans from
 * (earliest annotation − 3% of total range) to (latest annotation + 3% of total range),
 * clamped to the original bounds.
 * Returns undefined if the time range cannot be resolved.
 */
export declare const buildFocusedViewTimeRange: (annotationEvents: ChangePointCardModel["annotationEvents"], chartTimeRange: TimeRange) => TimeRange | undefined;
