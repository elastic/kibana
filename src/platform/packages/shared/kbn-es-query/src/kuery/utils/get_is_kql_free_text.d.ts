import type { KueryNode } from '../../..';
/**
 * Returns true whether the given expression contains at least one free text expression (e.g. `foo: "bar" AND my_free_text_query`)
 */
export declare function getIsKqlFreeTextExpression(expression: string): boolean;
export declare function getIsKqlFreeText(node: KueryNode): boolean;
