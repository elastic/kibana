import type { ESQLColumn, ESQLFunction, ESQLLiteral, ESQLParamLiteral, ESQLProperNode } from '@elastic/esql/types';
import type { Params } from '../types';
type ReplaceableNodes = ESQLParamLiteral | ESQLLiteral | ESQLColumn | ESQLFunction;
export declare class ParameterReplacer {
    private parametersMap;
    private positionalIndex;
    constructor(params?: Params);
    private buildParametersMap;
    shouldReplaceNode(node: ReplaceableNodes): boolean;
    replace<TNode extends ReplaceableNodes>(node: TNode, parent?: ESQLProperNode): TNode;
    private replaceFunctionExpression;
    private replaceColumnExpression;
    private resolveParamValue;
    private buildReplacementAstNode;
    private resolveFunctionName;
    private buildLiteral;
}
export {};
