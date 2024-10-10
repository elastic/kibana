import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Rollup {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes an existing rollup job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-delete-job.html | Elasticsearch API documentation}
      */
    deleteJob(this: That, params: T.RollupDeleteJobRequest | TB.RollupDeleteJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupDeleteJobResponse>;
    deleteJob(this: That, params: T.RollupDeleteJobRequest | TB.RollupDeleteJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupDeleteJobResponse, unknown>>;
    deleteJob(this: That, params: T.RollupDeleteJobRequest | TB.RollupDeleteJobRequest, options?: TransportRequestOptions): Promise<T.RollupDeleteJobResponse>;
    /**
      * Retrieves the configuration, stats, and status of rollup jobs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-get-job.html | Elasticsearch API documentation}
      */
    getJobs(this: That, params?: T.RollupGetJobsRequest | TB.RollupGetJobsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupGetJobsResponse>;
    getJobs(this: That, params?: T.RollupGetJobsRequest | TB.RollupGetJobsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupGetJobsResponse, unknown>>;
    getJobs(this: That, params?: T.RollupGetJobsRequest | TB.RollupGetJobsRequest, options?: TransportRequestOptions): Promise<T.RollupGetJobsResponse>;
    /**
      * Returns the capabilities of any rollup jobs that have been configured for a specific index or index pattern.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-get-rollup-caps.html | Elasticsearch API documentation}
      */
    getRollupCaps(this: That, params?: T.RollupGetRollupCapsRequest | TB.RollupGetRollupCapsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupGetRollupCapsResponse>;
    getRollupCaps(this: That, params?: T.RollupGetRollupCapsRequest | TB.RollupGetRollupCapsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupGetRollupCapsResponse, unknown>>;
    getRollupCaps(this: That, params?: T.RollupGetRollupCapsRequest | TB.RollupGetRollupCapsRequest, options?: TransportRequestOptions): Promise<T.RollupGetRollupCapsResponse>;
    /**
      * Returns the rollup capabilities of all jobs inside of a rollup index (for example, the index where rollup data is stored).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-get-rollup-index-caps.html | Elasticsearch API documentation}
      */
    getRollupIndexCaps(this: That, params: T.RollupGetRollupIndexCapsRequest | TB.RollupGetRollupIndexCapsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupGetRollupIndexCapsResponse>;
    getRollupIndexCaps(this: That, params: T.RollupGetRollupIndexCapsRequest | TB.RollupGetRollupIndexCapsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupGetRollupIndexCapsResponse, unknown>>;
    getRollupIndexCaps(this: That, params: T.RollupGetRollupIndexCapsRequest | TB.RollupGetRollupIndexCapsRequest, options?: TransportRequestOptions): Promise<T.RollupGetRollupIndexCapsResponse>;
    /**
      * Creates a rollup job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-put-job.html | Elasticsearch API documentation}
      */
    putJob(this: That, params: T.RollupPutJobRequest | TB.RollupPutJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupPutJobResponse>;
    putJob(this: That, params: T.RollupPutJobRequest | TB.RollupPutJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupPutJobResponse, unknown>>;
    putJob(this: That, params: T.RollupPutJobRequest | TB.RollupPutJobRequest, options?: TransportRequestOptions): Promise<T.RollupPutJobResponse>;
    /**
      * Enables searching rolled-up data using the standard Query DSL.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-search.html | Elasticsearch API documentation}
      */
    rollupSearch<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.RollupRollupSearchRequest | TB.RollupRollupSearchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupRollupSearchResponse<TDocument, TAggregations>>;
    rollupSearch<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.RollupRollupSearchRequest | TB.RollupRollupSearchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupRollupSearchResponse<TDocument, TAggregations>, unknown>>;
    rollupSearch<TDocument = unknown, TAggregations = Record<T.AggregateName, T.AggregationsAggregate>>(this: That, params: T.RollupRollupSearchRequest | TB.RollupRollupSearchRequest, options?: TransportRequestOptions): Promise<T.RollupRollupSearchResponse<TDocument, TAggregations>>;
    /**
      * Starts an existing, stopped rollup job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-start-job.html | Elasticsearch API documentation}
      */
    startJob(this: That, params: T.RollupStartJobRequest | TB.RollupStartJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupStartJobResponse>;
    startJob(this: That, params: T.RollupStartJobRequest | TB.RollupStartJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupStartJobResponse, unknown>>;
    startJob(this: That, params: T.RollupStartJobRequest | TB.RollupStartJobRequest, options?: TransportRequestOptions): Promise<T.RollupStartJobResponse>;
    /**
      * Stops an existing, started rollup job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/rollup-stop-job.html | Elasticsearch API documentation}
      */
    stopJob(this: That, params: T.RollupStopJobRequest | TB.RollupStopJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.RollupStopJobResponse>;
    stopJob(this: That, params: T.RollupStopJobRequest | TB.RollupStopJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.RollupStopJobResponse, unknown>>;
    stopJob(this: That, params: T.RollupStopJobRequest | TB.RollupStopJobRequest, options?: TransportRequestOptions): Promise<T.RollupStopJobResponse>;
}
export {};
