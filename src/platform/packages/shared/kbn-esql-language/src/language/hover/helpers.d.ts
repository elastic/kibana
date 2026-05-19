import type { ESQLControlVariable } from '@kbn/esql-types';
import { type WalkerAstNode } from '@elastic/esql';
export declare const getVariablesHoverContent: (node?: WalkerAstNode, variables?: ESQLControlVariable[]) => {
    value: string;
}[];
export declare function getPromqlHoverItem(root: WalkerAstNode, offset: number): {
    contents: Array<{
        value: string;
    }>;
};
