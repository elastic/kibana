import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Esql {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Executes an ESQL request asynchronously
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/esql-async-query-api.html | Elasticsearch API documentation}
      */
    asyncQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    asyncQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    asyncQuery(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves the results of a previously submitted async query request given its ID.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/esql-async-query-get-api.html | Elasticsearch API documentation}
      */
    asyncQueryGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    asyncQueryGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    asyncQueryGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Executes an ES|QL request
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/esql-rest.html | Elasticsearch API documentation}
      */
    query(this: That, params: T.EsqlQueryRequest | TB.EsqlQueryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.EsqlQueryResponse>;
    query(this: That, params: T.EsqlQueryRequest | TB.EsqlQueryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.EsqlQueryResponse, unknown>>;
    query(this: That, params: T.EsqlQueryRequest | TB.EsqlQueryRequest, options?: TransportRequestOptions): Promise<T.EsqlQueryResponse>;
}
export {};
