import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Slm {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes an existing snapshot lifecycle policy.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-delete-policy.html | Elasticsearch API documentation}
      */
    deleteLifecycle(this: That, params: T.SlmDeleteLifecycleRequest | TB.SlmDeleteLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmDeleteLifecycleResponse>;
    deleteLifecycle(this: That, params: T.SlmDeleteLifecycleRequest | TB.SlmDeleteLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmDeleteLifecycleResponse, unknown>>;
    deleteLifecycle(this: That, params: T.SlmDeleteLifecycleRequest | TB.SlmDeleteLifecycleRequest, options?: TransportRequestOptions): Promise<T.SlmDeleteLifecycleResponse>;
    /**
      * Immediately creates a snapshot according to the lifecycle policy, without waiting for the scheduled time.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-execute-lifecycle.html | Elasticsearch API documentation}
      */
    executeLifecycle(this: That, params: T.SlmExecuteLifecycleRequest | TB.SlmExecuteLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmExecuteLifecycleResponse>;
    executeLifecycle(this: That, params: T.SlmExecuteLifecycleRequest | TB.SlmExecuteLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmExecuteLifecycleResponse, unknown>>;
    executeLifecycle(this: That, params: T.SlmExecuteLifecycleRequest | TB.SlmExecuteLifecycleRequest, options?: TransportRequestOptions): Promise<T.SlmExecuteLifecycleResponse>;
    /**
      * Deletes any snapshots that are expired according to the policy's retention rules.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-execute-retention.html | Elasticsearch API documentation}
      */
    executeRetention(this: That, params?: T.SlmExecuteRetentionRequest | TB.SlmExecuteRetentionRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmExecuteRetentionResponse>;
    executeRetention(this: That, params?: T.SlmExecuteRetentionRequest | TB.SlmExecuteRetentionRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmExecuteRetentionResponse, unknown>>;
    executeRetention(this: That, params?: T.SlmExecuteRetentionRequest | TB.SlmExecuteRetentionRequest, options?: TransportRequestOptions): Promise<T.SlmExecuteRetentionResponse>;
    /**
      * Retrieves one or more snapshot lifecycle policy definitions and information about the latest snapshot attempts.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-get-policy.html | Elasticsearch API documentation}
      */
    getLifecycle(this: That, params?: T.SlmGetLifecycleRequest | TB.SlmGetLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmGetLifecycleResponse>;
    getLifecycle(this: That, params?: T.SlmGetLifecycleRequest | TB.SlmGetLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmGetLifecycleResponse, unknown>>;
    getLifecycle(this: That, params?: T.SlmGetLifecycleRequest | TB.SlmGetLifecycleRequest, options?: TransportRequestOptions): Promise<T.SlmGetLifecycleResponse>;
    /**
      * Returns global and policy-level statistics about actions taken by snapshot lifecycle management.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-get-stats.html | Elasticsearch API documentation}
      */
    getStats(this: That, params?: T.SlmGetStatsRequest | TB.SlmGetStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmGetStatsResponse>;
    getStats(this: That, params?: T.SlmGetStatsRequest | TB.SlmGetStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmGetStatsResponse, unknown>>;
    getStats(this: That, params?: T.SlmGetStatsRequest | TB.SlmGetStatsRequest, options?: TransportRequestOptions): Promise<T.SlmGetStatsResponse>;
    /**
      * Retrieves the status of snapshot lifecycle management (SLM).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-get-status.html | Elasticsearch API documentation}
      */
    getStatus(this: That, params?: T.SlmGetStatusRequest | TB.SlmGetStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmGetStatusResponse>;
    getStatus(this: That, params?: T.SlmGetStatusRequest | TB.SlmGetStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmGetStatusResponse, unknown>>;
    getStatus(this: That, params?: T.SlmGetStatusRequest | TB.SlmGetStatusRequest, options?: TransportRequestOptions): Promise<T.SlmGetStatusResponse>;
    /**
      * Creates or updates a snapshot lifecycle policy.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-put-policy.html | Elasticsearch API documentation}
      */
    putLifecycle(this: That, params: T.SlmPutLifecycleRequest | TB.SlmPutLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmPutLifecycleResponse>;
    putLifecycle(this: That, params: T.SlmPutLifecycleRequest | TB.SlmPutLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmPutLifecycleResponse, unknown>>;
    putLifecycle(this: That, params: T.SlmPutLifecycleRequest | TB.SlmPutLifecycleRequest, options?: TransportRequestOptions): Promise<T.SlmPutLifecycleResponse>;
    /**
      * Turns on snapshot lifecycle management (SLM).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-start.html | Elasticsearch API documentation}
      */
    start(this: That, params?: T.SlmStartRequest | TB.SlmStartRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmStartResponse>;
    start(this: That, params?: T.SlmStartRequest | TB.SlmStartRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmStartResponse, unknown>>;
    start(this: That, params?: T.SlmStartRequest | TB.SlmStartRequest, options?: TransportRequestOptions): Promise<T.SlmStartResponse>;
    /**
      * Turns off snapshot lifecycle management (SLM).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/slm-api-stop.html | Elasticsearch API documentation}
      */
    stop(this: That, params?: T.SlmStopRequest | TB.SlmStopRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SlmStopResponse>;
    stop(this: That, params?: T.SlmStopRequest | TB.SlmStopRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SlmStopResponse, unknown>>;
    stop(this: That, params?: T.SlmStopRequest | TB.SlmStopRequest, options?: TransportRequestOptions): Promise<T.SlmStopResponse>;
}
export {};
