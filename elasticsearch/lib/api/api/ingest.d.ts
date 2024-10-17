import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Ingest {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a geoip database configuration
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/TODO.html | Elasticsearch API documentation}
      */
    deleteGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    deleteGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    deleteGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Deletes one or more existing ingest pipeline.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-pipeline-api.html | Elasticsearch API documentation}
      */
    deletePipeline(this: That, params: T.IngestDeletePipelineRequest | TB.IngestDeletePipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestDeletePipelineResponse>;
    deletePipeline(this: That, params: T.IngestDeletePipelineRequest | TB.IngestDeletePipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestDeletePipelineResponse, unknown>>;
    deletePipeline(this: That, params: T.IngestDeletePipelineRequest | TB.IngestDeletePipelineRequest, options?: TransportRequestOptions): Promise<T.IngestDeletePipelineResponse>;
    /**
      * Gets download statistics for GeoIP2 databases used with the geoip processor.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/geoip-processor.html | Elasticsearch API documentation}
      */
    geoIpStats(this: That, params?: T.IngestGeoIpStatsRequest | TB.IngestGeoIpStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestGeoIpStatsResponse>;
    geoIpStats(this: That, params?: T.IngestGeoIpStatsRequest | TB.IngestGeoIpStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestGeoIpStatsResponse, unknown>>;
    geoIpStats(this: That, params?: T.IngestGeoIpStatsRequest | TB.IngestGeoIpStatsRequest, options?: TransportRequestOptions): Promise<T.IngestGeoIpStatsResponse>;
    /**
      * Returns geoip database configuration.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/TODO.html | Elasticsearch API documentation}
      */
    getGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    getGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    getGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Returns information about one or more ingest pipelines. This API returns a local reference of the pipeline.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-pipeline-api.html | Elasticsearch API documentation}
      */
    getPipeline(this: That, params?: T.IngestGetPipelineRequest | TB.IngestGetPipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestGetPipelineResponse>;
    getPipeline(this: That, params?: T.IngestGetPipelineRequest | TB.IngestGetPipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestGetPipelineResponse, unknown>>;
    getPipeline(this: That, params?: T.IngestGetPipelineRequest | TB.IngestGetPipelineRequest, options?: TransportRequestOptions): Promise<T.IngestGetPipelineResponse>;
    /**
      * Extracts structured fields out of a single text field within a document. You choose which field to extract matched fields from, as well as the grok pattern you expect will match. A grok pattern is like a regular expression that supports aliased expressions that can be reused.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/grok-processor.html | Elasticsearch API documentation}
      */
    processorGrok(this: That, params?: T.IngestProcessorGrokRequest | TB.IngestProcessorGrokRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestProcessorGrokResponse>;
    processorGrok(this: That, params?: T.IngestProcessorGrokRequest | TB.IngestProcessorGrokRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestProcessorGrokResponse, unknown>>;
    processorGrok(this: That, params?: T.IngestProcessorGrokRequest | TB.IngestProcessorGrokRequest, options?: TransportRequestOptions): Promise<T.IngestProcessorGrokResponse>;
    /**
      * Puts the configuration for a geoip database to be downloaded
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/TODO.html | Elasticsearch API documentation}
      */
    putGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    putGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    putGeoipDatabase(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates or updates an ingest pipeline. Changes made using this API take effect immediately.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ingest.html | Elasticsearch API documentation}
      */
    putPipeline(this: That, params: T.IngestPutPipelineRequest | TB.IngestPutPipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestPutPipelineResponse>;
    putPipeline(this: That, params: T.IngestPutPipelineRequest | TB.IngestPutPipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestPutPipelineResponse, unknown>>;
    putPipeline(this: That, params: T.IngestPutPipelineRequest | TB.IngestPutPipelineRequest, options?: TransportRequestOptions): Promise<T.IngestPutPipelineResponse>;
    /**
      * Executes an ingest pipeline against a set of provided documents.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/simulate-pipeline-api.html | Elasticsearch API documentation}
      */
    simulate(this: That, params?: T.IngestSimulateRequest | TB.IngestSimulateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IngestSimulateResponse>;
    simulate(this: That, params?: T.IngestSimulateRequest | TB.IngestSimulateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IngestSimulateResponse, unknown>>;
    simulate(this: That, params?: T.IngestSimulateRequest | TB.IngestSimulateRequest, options?: TransportRequestOptions): Promise<T.IngestSimulateResponse>;
}
export {};
