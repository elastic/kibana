import type { Serializable } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '../types';
interface Arguments {
    name: string[];
    value?: Serializable[];
}
export type ExpressionFunctionVarSet = ExpressionFunctionDefinition<'var_set', unknown, Arguments, unknown>;
export declare const variableSet: ExpressionFunctionVarSet;
export {};
