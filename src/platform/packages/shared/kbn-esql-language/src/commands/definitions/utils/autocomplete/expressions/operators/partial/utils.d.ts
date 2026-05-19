import type { ESQLFunction, ESQLSingleAstItem } from '@elastic/esql/types';
import type { PartialOperatorDetection } from '../../types';
export declare function createSyntheticListOperatorNode(operatorName: string, innerText: string, leftOperand?: ESQLSingleAstItem): ESQLFunction;
export declare function createSyntheticLikeOperatorNode(operatorName: string, innerText: string, leftOperand?: ESQLSingleAstItem): ESQLFunction;
/**
 * Detects partial IS NULL / IS NOT NULL operators.
 * Examples: "field IS ", "field IS N", "field IS NOT ", "field IS NOT N"
 */
export declare function detectNullCheck(innerText: string): PartialOperatorDetection | null;
/**
 * Detects partial LIKE / RLIKE / NOT LIKE / NOT RLIKE operators.
 * Examples: "field LIKE ", "field RLIKE ", "field NOT LIKE ", "field NOT RLIKE "
 */
export declare function detectLike(innerText: string): PartialOperatorDetection | null;
/**
 * Detects partial IN / NOT IN operators.
 * Examples: "field IN ", "field IN(", "field NOT IN ", "field NOT IN("
 */
export declare function detectIn(innerText: string): PartialOperatorDetection | null;
