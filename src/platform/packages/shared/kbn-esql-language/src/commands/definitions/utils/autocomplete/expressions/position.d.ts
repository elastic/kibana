import type { ESQLSingleAstItem } from '@elastic/esql/types';
import type { ESQLColumnData } from '../../../../registry/types';
export type ExpressionPosition = 'in_function' | 'after_not' | 'after_operator' | 'after_complete' | 'after_cast' | 'empty_expression';
/** Determines the position of the cursor within an expression */
export declare function getPosition(innerText: string, expressionRoot: ESQLSingleAstItem | undefined, columns?: Map<string, ESQLColumnData>): ExpressionPosition;
