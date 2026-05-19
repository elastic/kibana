import type { ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '../../query';
export declare const aggregateQueryToAst: ({ query, timeField, titleForInspector, descriptionForInspector, ignoreGlobalFilters, }: {
    query: AggregateQuery;
    timeField?: string;
    titleForInspector?: string;
    descriptionForInspector?: string;
    ignoreGlobalFilters?: boolean;
}) => undefined | ExpressionAstFunction;
