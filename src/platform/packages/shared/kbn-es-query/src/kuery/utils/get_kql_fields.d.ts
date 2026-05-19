import type { KueryNode } from '../../..';
/**
 * @param expression
 * @throws an exception is thrown when this function receives malformed or unsupported input.
 */
export declare function getKqlFieldNamesFromExpression(expression: string): string[];
/**
 * @throws an exception is thrown when this function receives a `node.type` or `node.function` that is
 * not supported.
 */
export declare function getKqlFieldNames(node: KueryNode): string[];
