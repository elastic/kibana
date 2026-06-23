import type { PromQLAstQueryExpression } from '@elastic/esql';
import type { PromqlDetailedPosition } from './types';
/** Routes cursor to the appropriate domain resolver based on deepest AST node. */
export declare function getQueryPosition(root: PromQLAstQueryExpression, cursor: number, text: string): PromqlDetailedPosition;
