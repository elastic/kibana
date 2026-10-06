import type { ProjectRouting } from '@kbn/es-query';
import { type FilterExpressionValue } from './filter_input_codec';
import { type ProjectRoutingExpression } from './project_routing_codec';
export { type FilterExpressionValue, FilterOperator, type FilterOperatorLiteral, } from './filter_input_codec';
export { projectRoutingCodec, encodeFilterOnlyRouting, type ProjectRoutingExpression, type ProjectRoutingStrategy, ROUTING_WILDCARD, PROJECT_SELECTION_DIMENSION, } from './project_routing_codec';
/** EXISTS `_alias` — the filter half of `PROJECT_ROUTING.ORIGIN` (`_alias:_origin`). */
export declare const ALIAS_EXISTS_FILTER: FilterExpressionValue;
export declare const isAliasExistsFilter: (expression: FilterExpressionValue) => boolean;
export declare const createFilterExpressionsMap: (expressions: readonly FilterExpressionValue[]) => Map<string, {
    expression: {
        tagName: string;
        operator: "is" | "not";
        tagValue: string;
    } | {
        tagName: string;
        operator: "notOneOf" | "oneOf";
        tagValue: string[];
    } | {
        tagName: string;
        operator: "exists" | "notExists";
        tagValue: undefined;
    };
    enabled: boolean;
}>;
export declare function reconcileDecodedRouting(decoded: ProjectRoutingExpression, availableProjectIds: readonly string[]): {
    filterExpressions: FilterExpressionValue[];
    excludedOverrides: string[];
};
/**
 * Parses a project routing string into filter expressions and excluded-project overrides.
 *
 * `PROJECT_ROUTING.ALL` / `PROJECT_ROUTING.ORIGIN` (`_alias:*` / `_alias:_origin`) are closed
 * shapes handled here and never passed to the codec. ALL is EXISTS `_alias` with no exclusions;
 * ORIGIN is the same filter plus exclusions of every non-origin project.
 */
export declare function parseDefaultProjectRouting(routing: ProjectRouting, availableProjectIds: readonly string[], originProjectId?: string): {
    filterExpressions: FilterExpressionValue[];
    excludedOverrides: string[];
};
/**
 * Whether two routing strings describe the same filters and exclusions.
 *
 * Compares parsed filter identity and exclusion sets rather than the strings themselves:
 * re-encoding is not string-stable (`snapshot` expands `_id:…`; `dynamic` can collapse
 * equivalent clauses), so byte equality would treat a no-op round-trip as a change.
 */
export declare function areProjectRoutingsEquivalent(left: ProjectRouting, right: ProjectRouting, availableProjectIds: readonly string[], originProjectId?: string): boolean;
