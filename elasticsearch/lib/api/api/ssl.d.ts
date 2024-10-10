import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Ssl {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Retrieves information about the X.509 certificates used to encrypt communications in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-ssl.html | Elasticsearch API documentation}
      */
    certificates(this: That, params?: T.SslCertificatesRequest | TB.SslCertificatesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SslCertificatesResponse>;
    certificates(this: That, params?: T.SslCertificatesRequest | TB.SslCertificatesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SslCertificatesResponse, unknown>>;
    certificates(this: That, params?: T.SslCertificatesRequest | TB.SslCertificatesRequest, options?: TransportRequestOptions): Promise<T.SslCertificatesResponse>;
}
export {};
