import type { ESQLAstAllCommands, ESQLAstHeaderCommand, ESQLAstQueryExpression, ESQLCommand, ESQLSingleAstItem } from '@elastic/esql/types';
export interface InSubqueryReference {
    left: ESQLSingleAstItem;
    query: ESQLAstQueryExpression;
}
/**
 * Returns a list of subqueries to validate
 * @param rootCommands
 */
export declare function getSubqueriesToValidate(rootCommands: ESQLCommand[], headerCommands: ESQLAstHeaderCommand[]): ESQLAstQueryExpression[];
export declare function getInSubqueries(command: ESQLAstAllCommands): InSubqueryReference[];
