import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode, KqlLiteralNode } from '../node_types';
import type { KqlContext } from '../types';
export declare const KQL_FUNCTION_EXISTS = "exists";
export interface KqlExistsFunctionNode extends KqlFunctionNode {
    function: typeof KQL_FUNCTION_EXISTS;
    arguments: [KqlLiteralNode];
}
export declare function isNode(node: KqlFunctionNode): node is KqlExistsFunctionNode;
export declare function buildNodeParams(fieldName: string): {
    arguments: KqlLiteralNode[];
};
export declare function toElasticsearchQuery(node: KqlExistsFunctionNode, indexPattern?: DataViewBase, config?: KueryQueryOptions, context?: KqlContext): QueryDslQueryContainer;
export declare function toKqlExpression(node: KqlExistsFunctionNode): string;
