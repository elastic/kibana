import type { ISuggestionItem } from '../../../../../../registry/types';
import type { ExpressionContext, PartialOperatorDetection } from '../../types';
/**
 * Handles IS NULL / IS NOT NULL partial operators.
 * Generates suggestions directly without creating synthetic nodes.
 * Supports prefix matching: "IS N" suggests both IS NULL and IS NOT NULL.
 */
export declare function handleNullCheckOperator({ textBeforeCursor }: PartialOperatorDetection, { innerText }: ExpressionContext): Promise<ISuggestionItem[] | null>;
export declare function handleLikeOperator(detection: PartialOperatorDetection, context: ExpressionContext): Promise<ISuggestionItem[] | null>;
export declare function handleInOperator(detection: PartialOperatorDetection, context: ExpressionContext): Promise<ISuggestionItem[] | null>;
