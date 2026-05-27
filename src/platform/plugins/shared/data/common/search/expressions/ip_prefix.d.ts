import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
export interface IpPrefix {
    prefixLength?: number;
    isIpv6?: boolean;
}
export type IpPrefixOutput = ExpressionValueBoxed<'ip_prefix', IpPrefix>;
export type ExpressionFunctionIpPrefix = ExpressionFunctionDefinition<'ipPrefix', null, IpPrefix, IpPrefixOutput>;
export declare const ipPrefixFunction: ExpressionFunctionIpPrefix;
