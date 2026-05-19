import type { Assign } from '@kbn/utility-types';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { GeoBoundingBoxOutput, KibanaQueryOutput } from '../../expressions';
import type { AggExpressionType, AggExpressionFunctionArgs } from '..';
import { BUCKET_TYPES } from '..';
export declare const aggFilterFnName = "aggFilter";
type Input = any;
type AggArgs = AggExpressionFunctionArgs<typeof BUCKET_TYPES.FILTER>;
type Arguments = Assign<AggArgs, {
    geo_bounding_box?: GeoBoundingBoxOutput;
    filter?: KibanaQueryOutput;
}>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggFilterFnName, Input, Arguments, Output>;
export declare const aggFilter: () => FunctionDefinition;
export {};
