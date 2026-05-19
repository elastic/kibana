import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode } from '../node_types';
import type { KqlContext } from '../types';
export declare const KQL_FUNCTION_NOT = "not";
export interface KqlNotFunctionNode extends KqlFunctionNode {
    function: typeof KQL_FUNCTION_NOT;
    arguments: [KqlFunctionNode];
}
export declare function isNode(node: KqlFunctionNode): node is KqlNotFunctionNode;
export declare function buildNodeParams(child: KueryNode): {
    arguments: KueryNode[];
};
export declare function toElasticsearchQuery(node: KqlNotFunctionNode, indexPattern?: DataViewBase, config?: KueryQueryOptions, context?: KqlContext): QueryDslQueryContainer;
export declare function toKqlExpression(node: KqlNotFunctionNode): string;
