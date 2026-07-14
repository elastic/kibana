import { type KueryNode } from '..';
export declare const KQL_NODE_TYPE_LITERAL = "literal";
export type KqlLiteralType = null | boolean | number | string;
export interface KqlLiteralNode extends KueryNode {
    type: typeof KQL_NODE_TYPE_LITERAL;
    value: KqlLiteralType;
    isQuoted: boolean;
}
export declare function isNode(node: KueryNode): node is KqlLiteralNode;
export declare function buildNode(value: KqlLiteralType, isQuoted?: boolean): KqlLiteralNode;
export declare function toElasticsearchQuery(node: KqlLiteralNode): KqlLiteralType;
export declare function toKqlExpression(node: KqlLiteralNode): string;
