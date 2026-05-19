import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataPatternName, DataTelemetryType } from './constants';
/**
 * Common counters for the {@link DataTelemetryDocument}s
 */
export interface DataTelemetryBasePayload {
    /** How many indices match the declared pattern **/
    index_count: number;
    /** How many indices match the declared pattern follow ECS conventions **/
    ecs_index_count?: number;
    /** How many documents are among all the identified indices **/
    doc_count?: number;
    /** Total size in bytes among all the identified indices **/
    size_in_bytes?: number;
}
/**
 * Depending on the type of index, we'll populate different keys as we identify them.
 */
export interface DataTelemetryDocument extends DataTelemetryBasePayload {
    /** For data-stream indices. Reporting their details **/
    data_stream?: {
        /** Name of the dataset in the data-stream **/
        dataset?: string;
        /** Type of the data-stream: "logs", "metrics", "traces" **/
        type?: DataTelemetryType | string;
    };
    /** When available, reporting the package details **/
    package?: {
        /** The package's name. Typically populated in the indices' _meta.package.name by Fleet. **/
        name: string;
    };
    /** What's the process indexing the data? (i.e.: "beats", "logstash") **/
    shipper?: string;
    /** When the data comes from a matching index-pattern, the name of the pattern **/
    pattern_name?: DataPatternName;
}
/**
 * The Data Telemetry is reported as an array of {@link DataTelemetryDocument}
 */
export type DataTelemetryPayload = DataTelemetryDocument[];
export interface DataTelemetryIndex {
    name: string;
    packageName?: string;
    managedBy?: string;
    dataStreamDataset?: string;
    dataStreamType?: string;
    shipper?: string;
    isECS?: boolean;
    docCount?: number;
    sizeInBytes?: number;
}
export declare function buildDataTelemetryPayload(indices: DataTelemetryIndex[]): DataTelemetryPayload;
export declare function getDataTelemetry(esClient: ElasticsearchClient): Promise<DataTelemetryPayload>;
