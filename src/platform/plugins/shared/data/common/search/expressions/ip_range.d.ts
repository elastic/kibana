import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface IpRange {
    from: string;
    to: string;
}
export type IpRangeOutput = ExpressionValueBoxed<'ip_range', IpRange>;
export type ExpressionFunctionIpRange = ExpressionFunctionDefinition<'ipRange', null, IpRange, IpRangeOutput>;
export declare const ipRangeFunction: ExpressionFunctionIpRange;
