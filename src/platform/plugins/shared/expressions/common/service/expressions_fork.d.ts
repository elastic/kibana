import type { ExpressionExecutionParams, ExpressionsService, ExpressionsServiceSetup, ExpressionsServiceStart } from '.';
import type { ExpressionAstExpression } from '../ast';
import type { AnyExpressionFunctionDefinition } from '../expression_functions';
import type { AnyExpressionTypeDefinition } from '../expression_types';
import type { AnyExpressionRenderDefinition } from '../expression_renderers';
export interface ExpressionServiceFork {
    setup(): ExpressionsServiceSetup;
    start(): ExpressionsServiceStart;
}
/**
 * `ExpressionsService` class is used for multiple purposes:
 *
 * 1. It implements the same Expressions service that can be used on both:
 *    (1) server-side and (2) browser-side.
 * 2. It implements the same Expressions service that users can fork/clone,
 *    thus have their own instance of the Expressions plugin.
 * 3. `ExpressionsService` defines the public contracts of *setup* and *start*
 *    Kibana Platform life-cycles for ease-of-use on server-side and browser-side.
 * 4. `ExpressionsService` creates a bound version of all exported contract functions.
 * 5. Functions are bound the way there are:
 *
 *    ```ts
 *    registerFunction = (...args: Parameters<Executor['registerFunction']>
 *      ): ReturnType<Executor['registerFunction']> => this.executor.registerFunction(...args);
 *    ```
 *
 *    so that JSDoc appears in developers IDE when they use those `plugins.expressions.registerFunction(`.
 */
export declare class ExpressionsServiceFork implements ExpressionServiceFork {
    private namespace;
    private expressionsService;
    /**
     * @note Workaround since the expressions service is frozen.
     */
    constructor(namespace: string, expressionsService: ExpressionsService);
    protected registerFunction(definition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
    protected registerRenderer(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
    protected registerType(definition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
    protected run<Input, Output>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): import("rxjs").Observable<import("..").ExecutionResult<import("../expression_types").ExpressionValueError | Output>>;
    protected execute<Input = unknown, Output = unknown>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): import("..").ExecutionContract<Input, Output, object>;
    protected getFunction(name: string): import("../expression_functions").ExpressionFunction | undefined;
    protected getFunctions(): Record<string, import("../expression_functions").ExpressionFunction>;
    /**
     * Returns Kibana Platform *setup* life-cycle contract. Useful to return the
     * same contract on server-side and browser-side.
     */
    setup(): ExpressionsServiceSetup;
    /**
     * Returns Kibana Platform *start* life-cycle contract. Useful to return the
     * same contract on server-side and browser-side.
     */
    start(): ExpressionsServiceStart;
}
