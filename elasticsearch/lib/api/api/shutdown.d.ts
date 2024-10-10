import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Shutdown {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Removes a node from the shutdown list. Designed for indirect use by ECE/ESS and ECK. Direct use is not supported.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current | Elasticsearch API documentation}
      */
    deleteNode(this: That, params: T.ShutdownDeleteNodeRequest | TB.ShutdownDeleteNodeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ShutdownDeleteNodeResponse>;
    deleteNode(this: That, params: T.ShutdownDeleteNodeRequest | TB.ShutdownDeleteNodeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ShutdownDeleteNodeResponse, unknown>>;
    deleteNode(this: That, params: T.ShutdownDeleteNodeRequest | TB.ShutdownDeleteNodeRequest, options?: TransportRequestOptions): Promise<T.ShutdownDeleteNodeResponse>;
    /**
      * Retrieve status of a node or nodes that are currently marked as shutting down. Designed for indirect use by ECE/ESS and ECK. Direct use is not supported.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current | Elasticsearch API documentation}
      */
    getNode(this: That, params?: T.ShutdownGetNodeRequest | TB.ShutdownGetNodeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ShutdownGetNodeResponse>;
    getNode(this: That, params?: T.ShutdownGetNodeRequest | TB.ShutdownGetNodeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ShutdownGetNodeResponse, unknown>>;
    getNode(this: That, params?: T.ShutdownGetNodeRequest | TB.ShutdownGetNodeRequest, options?: TransportRequestOptions): Promise<T.ShutdownGetNodeResponse>;
    /**
      * Adds a node to be shut down. Designed for indirect use by ECE/ESS and ECK. Direct use is not supported.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/current | Elasticsearch API documentation}
      */
    putNode(this: That, params: T.ShutdownPutNodeRequest | TB.ShutdownPutNodeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ShutdownPutNodeResponse>;
    putNode(this: That, params: T.ShutdownPutNodeRequest | TB.ShutdownPutNodeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ShutdownPutNodeResponse, unknown>>;
    putNode(this: That, params: T.ShutdownPutNodeRequest | TB.ShutdownPutNodeRequest, options?: TransportRequestOptions): Promise<T.ShutdownPutNodeResponse>;
}
export {};
