import type { AggregateQuery, Query } from '@kbn/es-query';
export declare const getEsqlQuery: (query: Query | AggregateQuery | undefined) => string | undefined;
