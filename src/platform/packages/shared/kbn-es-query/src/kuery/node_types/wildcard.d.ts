import type { KueryNode } from '..';
export declare const KQL_WILDCARD_SYMBOL = "@kuery-wildcard@";
export declare const KQL_NODE_TYPE_WILDCARD = "wildcard";
export interface KqlWildcardNode extends KueryNode {
    type: typeof KQL_NODE_TYPE_WILDCARD;
    value: string;
}
export declare function isNode(node: KueryNode): node is KqlWildcardNode;
export declare function isMatchAll(node: KqlWildcardNode): boolean;
export declare function buildNode(value: string): KqlWildcardNode;
export declare function test(node: KqlWildcardNode, str: string): boolean;
export declare function toElasticsearchQuery(node: KqlWildcardNode): string;
export declare function toQueryStringQuery(node: KqlWildcardNode): string;
export declare function isLoneWildcard({ value }: KqlWildcardNode): boolean;
export declare function hasLeadingWildcard(node: KqlWildcardNode): boolean;
export declare function toKqlExpression(node: KqlWildcardNode): string;
