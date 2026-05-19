import type { AggregateQuery, Query } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
export declare function resolveEsqlVariables(query: Query | AggregateQuery, variables: ESQLControlVariable[] | undefined): Query | AggregateQuery;
