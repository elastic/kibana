import type { SerializableRecord } from '@kbn/utility-types';
import type { Query } from '../..';
import type { BoolQuery } from './types';
/** @internal */
export declare function buildQueryFromLucene(queries: Query[], queryStringOptions?: SerializableRecord, dateFormatTZ?: string): BoolQuery;
