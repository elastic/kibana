import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AggExpressionFunctionArgs, AggExpressionType, BUCKET_TYPES } from '..';
export declare const aggDiversifiedSamplerFnName = "aggDiversifiedSampler";
type Input = any;
type Arguments = AggExpressionFunctionArgs<typeof BUCKET_TYPES.DIVERSIFIED_SAMPLER>;
type Output = AggExpressionType;
type FunctionDefinition = ExpressionFunctionDefinition<typeof aggDiversifiedSamplerFnName, Input, Arguments, Output>;
export declare const aggDiversifiedSampler: () => FunctionDefinition;
export {};
