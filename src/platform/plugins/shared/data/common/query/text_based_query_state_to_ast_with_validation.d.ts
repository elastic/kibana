import type { Query } from '@kbn/es-query';
import type { QueryState } from '..';
interface Args extends QueryState {
    inputQuery?: Query;
    timeFieldName?: string;
    titleForInspector?: string;
    descriptionForInspector?: string;
}
/**
 * Converts QueryState to expression AST
 * @param filters array of kibana filters
 * @param query kibana query or aggregate query
 * @param inputQuery
 * @param time kibana time range
 * @param timeFieldName
 * @param titleForInspector
 * @param descriptionForInspector
 */
export declare function textBasedQueryStateToAstWithValidation({ filters, query, inputQuery, time, timeFieldName, titleForInspector, descriptionForInspector, }: Args): Promise<import("../../../expressions/common").ExpressionAstExpression | undefined>;
export {};
