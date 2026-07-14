import type { PromQLAstQueryExpression } from '@elastic/esql';
import type { CursorContext } from './types';
/** Single walker pass: finds narrowest node at cursor AND innermost function containing cursor. */
export declare function findCursorContext(root: PromQLAstQueryExpression, cursor: number): CursorContext;
/** Checks if cursor is after a complete top-level expression with trailing space. */
export declare function isAfterCompleteExpression(root: PromQLAstQueryExpression, cursor: number): boolean;
/** Checks if cursor is logically inside a grouping (including right after open paren). */
export declare function isCursorInsideGrouping(cursor: number, grouping: {
    location: {
        min: number;
        max: number;
    };
    args: unknown[];
}): boolean;
