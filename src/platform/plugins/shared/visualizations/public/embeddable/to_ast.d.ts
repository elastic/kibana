import type { VisToExpressionAst } from '../types';
/**
 * Creates an ast expression for a visualization based on kibana context (query, filters, timerange)
 * including a saved search if the visualization is based on it.
 * The expression also includes particular visualization expression ast if presented.
 *
 * @internal
 */
export declare const toExpressionAst: VisToExpressionAst;
