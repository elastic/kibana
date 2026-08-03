import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
import type { CidrOutput, IpRangeOutput } from '../../expressions';
export declare const aggIpRangeFnName = "aggIpRange";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.IP_RANGE>;
type Arguments = Assign<AggArgs, {
    ranges?: Array<CidrOutput | IpRangeOutput>;
    ipRangeType?: string;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggIpRangeFnName, Input, Arguments, Output>;
export declare const aggIpRange: () => FunctionDefinition;
export {};
