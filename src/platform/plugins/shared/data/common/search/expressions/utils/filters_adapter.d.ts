import type { Filter } from '@kbn/es-query';
import type { ExpressionValueFilter } from '@kbn/expressions-plugin/common';
export declare function adaptToExpressionValueFilter(filter: Filter): ExpressionValueFilter;
