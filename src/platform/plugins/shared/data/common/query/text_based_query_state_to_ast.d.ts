import type { Query } from '@kbn/es-query';
import type { QueryState } from '..';
interface Args extends QueryState {
    timeFieldName?: string;
    inputQuery?: Query;
    titleForInspector?: string;
    descriptionForInspector?: string;
    ignoreGlobalFilters?: boolean;
}
/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param inputQuery
 * @param time kibana time range
 * @param dataView
 * @param titleForInspector
 * @param descriptionForInspector
 */
export declare function textBasedQueryStateToExpressionAst({ filters, query, inputQuery, time, timeFieldName, titleForInspector, descriptionForInspector, ignoreGlobalFilters, }: Args): import("@kbn/expressions-plugin/common").ExpressionAstExpression;
export {};
