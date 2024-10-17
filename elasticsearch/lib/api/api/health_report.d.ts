import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
/**
  * Returns the health of the cluster.
  * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/health-api.html | Elasticsearch API documentation}
  */
export default function HealthReportApi(this: That, params?: T.HealthReportRequest | TB.HealthReportRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.HealthReportResponse>;
export default function HealthReportApi(this: That, params?: T.HealthReportRequest | TB.HealthReportRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.HealthReportResponse, unknown>>;
export default function HealthReportApi(this: That, params?: T.HealthReportRequest | TB.HealthReportRequest, options?: TransportRequestOptions): Promise<T.HealthReportResponse>;
export {};
