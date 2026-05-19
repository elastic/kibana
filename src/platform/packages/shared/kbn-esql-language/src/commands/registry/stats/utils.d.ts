import type { ESQLAstAllCommands, ESQLFunction, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ISuggestionItem } from '../types';
/**
 * Position of the caret in the sort command:
*
* ```
* STATS [column1 =] expression1[, ..., [columnN =] expressionN] [BY [column1 =] grouping_expression1[, ..., grouping_expressionN]]
        |           |          |                                    |           |                   |
        |           |          expression_complete                  |           |                   grouping_expression_complete
        |           expression_after_assignment                     |           grouping_expression_after_assignment
        expression_without_assignment                               grouping_expression_without_assignment

* ```
*/
export type CaretPosition = 'expression_without_assignment' | 'expression_after_assignment' | 'grouping_expression_without_assignment' | 'grouping_expression_after_assignment' | 'after_where';
export declare const getPosition: (command: ESQLAstAllCommands, innerText: string) => CaretPosition;
export declare const byCompleteItem: ISuggestionItem;
export declare const whereCompleteItem: ISuggestionItem;
export declare function checkAggExistence(arg: ESQLFunction): boolean;
export declare function checkFunctionContent(arg: ESQLFunction): boolean;
export declare const rightAfterColumn: (innerText: string, expressionRoot: ESQLSingleAstItem | undefined, columnExists: (name: string) => boolean) => boolean;
export declare const getCommaAndPipe: (innerText: string, expressionRoot: ESQLSingleAstItem | undefined, columnExists: (name: string) => boolean) => ISuggestionItem[];
