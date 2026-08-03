import type { SerializableRecord } from '@kbn/utility-types';
import type { JobId } from './types';
type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;
type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;
export interface LocatorParams<P extends SerializableRecord = SerializableRecord> {
    id: string;
    /**
     * Kibana version used to create the params
     */
    version: string;
    /**
     * Data to recreate the user's state in the application
     */
    params: P;
}
type Url = string;
type UrlLocatorTuple = [url: Url, locatorParams: LocatorParams];
export type UrlOrUrlLocatorTuple = Url | UrlLocatorTuple;
export {};
