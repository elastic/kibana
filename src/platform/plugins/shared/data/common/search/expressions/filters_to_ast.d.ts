import type { Filter } from '@kbn/es-query';
export declare const filtersToAst: (filters: Filter[] | Filter) => import("@kbn/expressions-plugin/common").ExpressionAstExpression[];
