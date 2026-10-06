import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { IpPrefixOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggIpPrefixFnName = "aggIpPrefix";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.IP_PREFIX>;
type Arguments = Assign<AggArgs, {
    ipPrefix?: IpPrefixOutput;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggIpPrefixFnName, Input, Arguments, Output>;
export declare const aggIpPrefix: () => FunctionDefinition;
export {};
