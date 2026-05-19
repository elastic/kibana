import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ExpressionsServiceSetup, ExpressionsServiceStart } from '../common';
import { ReactExpressionRenderer } from './react_expression_renderer_wrapper';
import type { IExpressionLoader } from './loader';
import type { IExpressionRenderer } from './render';
/**
 * Expressions public setup contract, extends {@link ExpressionsServiceSetup}
 */
export type ExpressionsSetup = ExpressionsServiceSetup;
/**
 * Expressions public start contrect, extends {@link ExpressionServiceStart}
 */
export interface ExpressionsStart extends ExpressionsServiceStart {
    loader: IExpressionLoader;
    render: IExpressionRenderer;
    ReactExpressionRenderer: typeof ReactExpressionRenderer;
}
export declare class ExpressionsPublicPlugin implements Plugin<ExpressionsSetup, ExpressionsStart> {
    private static logger;
    private readonly expressions;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): ExpressionsSetup;
    start(core: CoreStart): ExpressionsStart;
    stop(): void;
}
