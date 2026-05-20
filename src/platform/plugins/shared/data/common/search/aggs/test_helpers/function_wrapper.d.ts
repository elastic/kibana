import type { AnyExpressionFunctionDefinition, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
/**
 * Takes a function spec and passes in default args,
 * overriding with any provided args.
 *
 * Similar to the test helper used in Expressions & Canvas,
 * however in this case we are ignoring the input & execution
 * context, as they are not applicable to the agg type
 * expression functions.
 */
export declare const functionWrapper: <T extends AnyExpressionFunctionDefinition>(spec: T) => (args: T extends ExpressionFunctionDefinition<infer Name, infer Input, infer Arguments, infer Output, infer Context> ? Arguments : never) => any;
