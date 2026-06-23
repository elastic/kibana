import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode } from '../node_types';
import type { KqlContext } from '../types';
export declare const KQL_FUNCTION_AND = "and";
export interface KqlAndFunctionNode extends KqlFunctionNode {
    function: typeof KQL_FUNCTION_AND;
    arguments: KqlFunctionNode[];
}
export declare function isNode(node: KqlFunctionNode): node is KqlAndFunctionNode;
export declare function buildNodeParams(children: KueryNode[]): {
    arguments: KueryNode[];
};
export declare function toElasticsearchQuery(node: KqlAndFunctionNode, indexPattern?: DataViewBase, config?: KueryQueryOptions, context?: KqlContext): QueryDslQueryContainer;
export declare function toKqlExpression(node: KqlAndFunctionNode): string;
