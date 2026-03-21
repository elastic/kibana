import type { ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import type { AggregateQuery } from '../../query';
export declare const aggregateQueryToAst: ({ query, timeField, titleForInspector, descriptionForInspector, }: {
    query: AggregateQuery;
    timeField?: string;
    titleForInspector?: string;
    descriptionForInspector?: string;
}) => undefined | ExpressionAstFunction;
