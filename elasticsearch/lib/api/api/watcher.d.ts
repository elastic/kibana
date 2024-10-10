import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Watcher {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Acknowledges a watch, manually throttling the execution of the watch's actions.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-ack-watch.html | Elasticsearch API documentation}
      */
    ackWatch(this: That, params: T.WatcherAckWatchRequest | TB.WatcherAckWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherAckWatchResponse>;
    ackWatch(this: That, params: T.WatcherAckWatchRequest | TB.WatcherAckWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherAckWatchResponse, unknown>>;
    ackWatch(this: That, params: T.WatcherAckWatchRequest | TB.WatcherAckWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherAckWatchResponse>;
    /**
      * Activates a currently inactive watch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-activate-watch.html | Elasticsearch API documentation}
      */
    activateWatch(this: That, params: T.WatcherActivateWatchRequest | TB.WatcherActivateWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherActivateWatchResponse>;
    activateWatch(this: That, params: T.WatcherActivateWatchRequest | TB.WatcherActivateWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherActivateWatchResponse, unknown>>;
    activateWatch(this: That, params: T.WatcherActivateWatchRequest | TB.WatcherActivateWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherActivateWatchResponse>;
    /**
      * Deactivates a currently active watch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-deactivate-watch.html | Elasticsearch API documentation}
      */
    deactivateWatch(this: That, params: T.WatcherDeactivateWatchRequest | TB.WatcherDeactivateWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherDeactivateWatchResponse>;
    deactivateWatch(this: That, params: T.WatcherDeactivateWatchRequest | TB.WatcherDeactivateWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherDeactivateWatchResponse, unknown>>;
    deactivateWatch(this: That, params: T.WatcherDeactivateWatchRequest | TB.WatcherDeactivateWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherDeactivateWatchResponse>;
    /**
      * Removes a watch from Watcher.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-delete-watch.html | Elasticsearch API documentation}
      */
    deleteWatch(this: That, params: T.WatcherDeleteWatchRequest | TB.WatcherDeleteWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherDeleteWatchResponse>;
    deleteWatch(this: That, params: T.WatcherDeleteWatchRequest | TB.WatcherDeleteWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherDeleteWatchResponse, unknown>>;
    deleteWatch(this: That, params: T.WatcherDeleteWatchRequest | TB.WatcherDeleteWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherDeleteWatchResponse>;
    /**
      * This API can be used to force execution of the watch outside of its triggering logic or to simulate the watch execution for debugging purposes. For testing and debugging purposes, you also have fine-grained control on how the watch runs. You can execute the watch without executing all of its actions or alternatively by simulating them. You can also force execution by ignoring the watch condition and control whether a watch record would be written to the watch history after execution.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-execute-watch.html | Elasticsearch API documentation}
      */
    executeWatch(this: That, params?: T.WatcherExecuteWatchRequest | TB.WatcherExecuteWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherExecuteWatchResponse>;
    executeWatch(this: That, params?: T.WatcherExecuteWatchRequest | TB.WatcherExecuteWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherExecuteWatchResponse, unknown>>;
    executeWatch(this: That, params?: T.WatcherExecuteWatchRequest | TB.WatcherExecuteWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherExecuteWatchResponse>;
    /**
      * Retrieve settings for the watcher system index
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-get-settings.html | Elasticsearch API documentation}
      */
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves a watch by its ID.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-get-watch.html | Elasticsearch API documentation}
      */
    getWatch(this: That, params: T.WatcherGetWatchRequest | TB.WatcherGetWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherGetWatchResponse>;
    getWatch(this: That, params: T.WatcherGetWatchRequest | TB.WatcherGetWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherGetWatchResponse, unknown>>;
    getWatch(this: That, params: T.WatcherGetWatchRequest | TB.WatcherGetWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherGetWatchResponse>;
    /**
      * Creates a new watch, or updates an existing one.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-put-watch.html | Elasticsearch API documentation}
      */
    putWatch(this: That, params: T.WatcherPutWatchRequest | TB.WatcherPutWatchRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherPutWatchResponse>;
    putWatch(this: That, params: T.WatcherPutWatchRequest | TB.WatcherPutWatchRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherPutWatchResponse, unknown>>;
    putWatch(this: That, params: T.WatcherPutWatchRequest | TB.WatcherPutWatchRequest, options?: TransportRequestOptions): Promise<T.WatcherPutWatchResponse>;
    /**
      * Retrieves stored watches.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-query-watches.html | Elasticsearch API documentation}
      */
    queryWatches(this: That, params?: T.WatcherQueryWatchesRequest | TB.WatcherQueryWatchesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherQueryWatchesResponse>;
    queryWatches(this: That, params?: T.WatcherQueryWatchesRequest | TB.WatcherQueryWatchesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherQueryWatchesResponse, unknown>>;
    queryWatches(this: That, params?: T.WatcherQueryWatchesRequest | TB.WatcherQueryWatchesRequest, options?: TransportRequestOptions): Promise<T.WatcherQueryWatchesResponse>;
    /**
      * Starts Watcher if it is not already running.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-start.html | Elasticsearch API documentation}
      */
    start(this: That, params?: T.WatcherStartRequest | TB.WatcherStartRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherStartResponse>;
    start(this: That, params?: T.WatcherStartRequest | TB.WatcherStartRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherStartResponse, unknown>>;
    start(this: That, params?: T.WatcherStartRequest | TB.WatcherStartRequest, options?: TransportRequestOptions): Promise<T.WatcherStartResponse>;
    /**
      * Retrieves the current Watcher metrics.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-stats.html | Elasticsearch API documentation}
      */
    stats(this: That, params?: T.WatcherStatsRequest | TB.WatcherStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherStatsResponse>;
    stats(this: That, params?: T.WatcherStatsRequest | TB.WatcherStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherStatsResponse, unknown>>;
    stats(this: That, params?: T.WatcherStatsRequest | TB.WatcherStatsRequest, options?: TransportRequestOptions): Promise<T.WatcherStatsResponse>;
    /**
      * Stops Watcher if it is running.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-stop.html | Elasticsearch API documentation}
      */
    stop(this: That, params?: T.WatcherStopRequest | TB.WatcherStopRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.WatcherStopResponse>;
    stop(this: That, params?: T.WatcherStopRequest | TB.WatcherStopRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.WatcherStopResponse, unknown>>;
    stop(this: That, params?: T.WatcherStopRequest | TB.WatcherStopRequest, options?: TransportRequestOptions): Promise<T.WatcherStopResponse>;
    /**
      * Update settings for the watcher system index
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/watcher-api-update-settings.html | Elasticsearch API documentation}
      */
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
}
export {};
