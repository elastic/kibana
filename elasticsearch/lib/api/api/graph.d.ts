import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Graph {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Extracts and summarizes information about the documents and terms in an Elasticsearch data stream or index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/graph-explore-api.html | Elasticsearch API documentation}
      */
    explore(this: That, params: T.GraphExploreRequest | TB.GraphExploreRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.GraphExploreResponse>;
    explore(this: That, params: T.GraphExploreRequest | TB.GraphExploreRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.GraphExploreResponse, unknown>>;
    explore(this: That, params: T.GraphExploreRequest | TB.GraphExploreRequest, options?: TransportRequestOptions): Promise<T.GraphExploreResponse>;
}
export {};
