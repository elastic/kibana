import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode } from '../node_types';
import type { KqlContext } from '../types';
export declare const KQL_FUNCTION_OR = "or";
export interface KqlOrFunctionNode extends KqlFunctionNode {
    function: typeof KQL_FUNCTION_OR;
    arguments: KqlFunctionNode[];
}
export declare function isNode(node: KqlFunctionNode): node is KqlOrFunctionNode;
export declare function buildNodeParams(children: KueryNode[]): {
    arguments: KueryNode[];
};
export declare function toElasticsearchQuery(node: KqlOrFunctionNode, indexPattern?: DataViewBase, config?: KueryQueryOptions, context?: KqlContext): QueryDslQueryContainer;
export declare function toKqlExpression(node: KqlOrFunctionNode): string;
