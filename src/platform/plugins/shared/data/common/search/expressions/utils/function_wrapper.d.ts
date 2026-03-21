import type { AnyExpressionFunctionDefinition, ExecutionContext } from '@kbn/expressions-plugin/common';
/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 */
export declare const functionWrapper: (spec: AnyExpressionFunctionDefinition) => (context: object | null, args?: Record<string, any>, handlers?: ExecutionContext) => any;
