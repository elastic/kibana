import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Simulate {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Simulates running ingest with example documents.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/simulate-ingest-api.html | Elasticsearch API documentation}
      */
    ingest(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    ingest(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    ingest(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
}
export {};
