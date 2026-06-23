import type { KQL_FUNCTION_AND, KQL_FUNCTION_EXISTS, KQL_FUNCTION_NESTED, KQL_FUNCTION_IS, KQL_FUNCTION_NOT, KQL_FUNCTION_OR, KQL_FUNCTION_RANGE } from '../functions';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';
export declare const KQL_NODE_TYPE_FUNCTION = "function";
export type KqlFunctionName = typeof KQL_FUNCTION_AND | typeof KQL_FUNCTION_EXISTS | typeof KQL_FUNCTION_IS | typeof KQL_FUNCTION_NESTED | typeof KQL_FUNCTION_NOT | typeof KQL_FUNCTION_OR | typeof KQL_FUNCTION_RANGE;
export interface KqlFunctionNode extends KueryNode {
    arguments: unknown[];
    function: KqlFunctionName;
    type: typeof KQL_NODE_TYPE_FUNCTION;
}
export declare function isNode(node: KueryNode): node is KqlFunctionNode;
export declare function buildNode(functionName: KqlFunctionName, ...args: any[]): KqlFunctionNode;
export declare function buildNodeWithArgumentNodes(functionName: KqlFunctionName, args: any[]): KqlFunctionNode;
export declare function toElasticsearchQuery(node: KqlFunctionNode, indexPattern?: DataViewBase, config?: KueryQueryOptions, context?: KqlContext): KqlContext | undefined;
export declare function toKqlExpression(node: KqlFunctionNode): string;
