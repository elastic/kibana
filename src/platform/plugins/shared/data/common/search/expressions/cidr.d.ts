import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface Cidr {
    mask: string;
}
export type CidrOutput = ExpressionValueBoxed<'cidr', Cidr>;
export type ExpressionFunctionCidr = ExpressionFunctionDefinition<'cidr', null, Cidr, CidrOutput>;
export declare const cidrFunction: ExpressionFunctionCidr;
