import type { ESQLAstHeaderCommand, ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
/**
 * Returns a list of subqueries to validate
 * @param rootCommands
 */
export declare function getSubqueriesToValidate(rootCommands: ESQLCommand[], headerCommands: ESQLAstHeaderCommand[]): ESQLAstQueryExpression[];
