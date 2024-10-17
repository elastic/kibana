import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Xpack {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Provides general information about the installed X-Pack features.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/info-api.html | Elasticsearch API documentation}
      */
    info(this: That, params?: T.XpackInfoRequest | TB.XpackInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.XpackInfoResponse>;
    info(this: That, params?: T.XpackInfoRequest | TB.XpackInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.XpackInfoResponse, unknown>>;
    info(this: That, params?: T.XpackInfoRequest | TB.XpackInfoRequest, options?: TransportRequestOptions): Promise<T.XpackInfoResponse>;
    /**
      * This API provides information about which features are currently enabled and available under the current license and some usage statistics.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/usage-api.html | Elasticsearch API documentation}
      */
    usage(this: That, params?: T.XpackUsageRequest | TB.XpackUsageRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.XpackUsageResponse>;
    usage(this: That, params?: T.XpackUsageRequest | TB.XpackUsageRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.XpackUsageResponse, unknown>>;
    usage(this: That, params?: T.XpackUsageRequest | TB.XpackUsageRequest, options?: TransportRequestOptions): Promise<T.XpackUsageResponse>;
}
export {};
