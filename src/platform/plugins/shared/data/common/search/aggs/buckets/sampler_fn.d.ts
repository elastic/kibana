import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionFunctionArgs, AggExpressionType, BUCKET_TYPES } from '..';
export declare const aggSamplerFnName = "aggSampler";
type Input = any;
type Arguments = AggExpressionFunctionArgs<typeof BUCKET_TYPES.SAMPLER>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggSamplerFnName, Input, Arguments, Output>;
export declare const aggSampler: () => FunctionDefinition;
export {};
