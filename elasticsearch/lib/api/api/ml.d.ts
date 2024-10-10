import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Ml {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Clears a trained model deployment cache on all nodes where the trained model is assigned. A trained model deployment may have an inference cache enabled. As requests are handled by each allocated node, their responses may be cached on that individual node. Calling this API clears the caches without restarting the deployment.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/clear-trained-model-deployment-cache.html | Elasticsearch API documentation}
      */
    clearTrainedModelDeploymentCache(this: That, params: T.MlClearTrainedModelDeploymentCacheRequest | TB.MlClearTrainedModelDeploymentCacheRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlClearTrainedModelDeploymentCacheResponse>;
    clearTrainedModelDeploymentCache(this: That, params: T.MlClearTrainedModelDeploymentCacheRequest | TB.MlClearTrainedModelDeploymentCacheRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlClearTrainedModelDeploymentCacheResponse, unknown>>;
    clearTrainedModelDeploymentCache(this: That, params: T.MlClearTrainedModelDeploymentCacheRequest | TB.MlClearTrainedModelDeploymentCacheRequest, options?: TransportRequestOptions): Promise<T.MlClearTrainedModelDeploymentCacheResponse>;
    /**
      * Close anomaly detection jobs A job can be opened and closed multiple times throughout its lifecycle. A closed job cannot receive data or perform analysis operations, but you can still explore and navigate results. When you close a job, it runs housekeeping tasks such as pruning the model history, flushing buffers, calculating final results and persisting the model snapshots. Depending upon the size of the job, it could take several minutes to close and the equivalent time to re-open. After it is closed, the job has a minimal overhead on the cluster except for maintaining its meta data. Therefore it is a best practice to close jobs that are no longer required to process data. If you close an anomaly detection job whose datafeed is running, the request first tries to stop the datafeed. This behavior is equivalent to calling stop datafeed API with the same timeout and force parameters as the close job request. When a datafeed that has a specified end date stops, it automatically closes its associated job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-close-job.html | Elasticsearch API documentation}
      */
    closeJob(this: That, params: T.MlCloseJobRequest | TB.MlCloseJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlCloseJobResponse>;
    closeJob(this: That, params: T.MlCloseJobRequest | TB.MlCloseJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlCloseJobResponse, unknown>>;
    closeJob(this: That, params: T.MlCloseJobRequest | TB.MlCloseJobRequest, options?: TransportRequestOptions): Promise<T.MlCloseJobResponse>;
    /**
      * Removes all scheduled events from a calendar, then deletes it.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-calendar.html | Elasticsearch API documentation}
      */
    deleteCalendar(this: That, params: T.MlDeleteCalendarRequest | TB.MlDeleteCalendarRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteCalendarResponse>;
    deleteCalendar(this: That, params: T.MlDeleteCalendarRequest | TB.MlDeleteCalendarRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteCalendarResponse, unknown>>;
    deleteCalendar(this: That, params: T.MlDeleteCalendarRequest | TB.MlDeleteCalendarRequest, options?: TransportRequestOptions): Promise<T.MlDeleteCalendarResponse>;
    /**
      * Deletes scheduled events from a calendar.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-calendar-event.html | Elasticsearch API documentation}
      */
    deleteCalendarEvent(this: That, params: T.MlDeleteCalendarEventRequest | TB.MlDeleteCalendarEventRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteCalendarEventResponse>;
    deleteCalendarEvent(this: That, params: T.MlDeleteCalendarEventRequest | TB.MlDeleteCalendarEventRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteCalendarEventResponse, unknown>>;
    deleteCalendarEvent(this: That, params: T.MlDeleteCalendarEventRequest | TB.MlDeleteCalendarEventRequest, options?: TransportRequestOptions): Promise<T.MlDeleteCalendarEventResponse>;
    /**
      * Deletes anomaly detection jobs from a calendar.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-calendar-job.html | Elasticsearch API documentation}
      */
    deleteCalendarJob(this: That, params: T.MlDeleteCalendarJobRequest | TB.MlDeleteCalendarJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteCalendarJobResponse>;
    deleteCalendarJob(this: That, params: T.MlDeleteCalendarJobRequest | TB.MlDeleteCalendarJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteCalendarJobResponse, unknown>>;
    deleteCalendarJob(this: That, params: T.MlDeleteCalendarJobRequest | TB.MlDeleteCalendarJobRequest, options?: TransportRequestOptions): Promise<T.MlDeleteCalendarJobResponse>;
    /**
      * Deletes a data frame analytics job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-dfanalytics.html | Elasticsearch API documentation}
      */
    deleteDataFrameAnalytics(this: That, params: T.MlDeleteDataFrameAnalyticsRequest | TB.MlDeleteDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteDataFrameAnalyticsResponse>;
    deleteDataFrameAnalytics(this: That, params: T.MlDeleteDataFrameAnalyticsRequest | TB.MlDeleteDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteDataFrameAnalyticsResponse, unknown>>;
    deleteDataFrameAnalytics(this: That, params: T.MlDeleteDataFrameAnalyticsRequest | TB.MlDeleteDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlDeleteDataFrameAnalyticsResponse>;
    /**
      * Deletes an existing datafeed.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-datafeed.html | Elasticsearch API documentation}
      */
    deleteDatafeed(this: That, params: T.MlDeleteDatafeedRequest | TB.MlDeleteDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteDatafeedResponse>;
    deleteDatafeed(this: That, params: T.MlDeleteDatafeedRequest | TB.MlDeleteDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteDatafeedResponse, unknown>>;
    deleteDatafeed(this: That, params: T.MlDeleteDatafeedRequest | TB.MlDeleteDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlDeleteDatafeedResponse>;
    /**
      * Deletes expired and unused machine learning data. Deletes all job results, model snapshots and forecast data that have exceeded their retention days period. Machine learning state documents that are not associated with any job are also deleted. You can limit the request to a single or set of anomaly detection jobs by using a job identifier, a group name, a comma-separated list of jobs, or a wildcard expression. You can delete expired data for all anomaly detection jobs by using _all, by specifying * as the <job_id>, or by omitting the <job_id>.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-expired-data.html | Elasticsearch API documentation}
      */
    deleteExpiredData(this: That, params?: T.MlDeleteExpiredDataRequest | TB.MlDeleteExpiredDataRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteExpiredDataResponse>;
    deleteExpiredData(this: That, params?: T.MlDeleteExpiredDataRequest | TB.MlDeleteExpiredDataRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteExpiredDataResponse, unknown>>;
    deleteExpiredData(this: That, params?: T.MlDeleteExpiredDataRequest | TB.MlDeleteExpiredDataRequest, options?: TransportRequestOptions): Promise<T.MlDeleteExpiredDataResponse>;
    /**
      * Deletes a filter. If an anomaly detection job references the filter, you cannot delete the filter. You must update or delete the job before you can delete the filter.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-filter.html | Elasticsearch API documentation}
      */
    deleteFilter(this: That, params: T.MlDeleteFilterRequest | TB.MlDeleteFilterRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteFilterResponse>;
    deleteFilter(this: That, params: T.MlDeleteFilterRequest | TB.MlDeleteFilterRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteFilterResponse, unknown>>;
    deleteFilter(this: That, params: T.MlDeleteFilterRequest | TB.MlDeleteFilterRequest, options?: TransportRequestOptions): Promise<T.MlDeleteFilterResponse>;
    /**
      * Deletes forecasts from a machine learning job. By default, forecasts are retained for 14 days. You can specify a different retention period with the `expires_in` parameter in the forecast jobs API. The delete forecast API enables you to delete one or more forecasts before they expire.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-forecast.html | Elasticsearch API documentation}
      */
    deleteForecast(this: That, params: T.MlDeleteForecastRequest | TB.MlDeleteForecastRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteForecastResponse>;
    deleteForecast(this: That, params: T.MlDeleteForecastRequest | TB.MlDeleteForecastRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteForecastResponse, unknown>>;
    deleteForecast(this: That, params: T.MlDeleteForecastRequest | TB.MlDeleteForecastRequest, options?: TransportRequestOptions): Promise<T.MlDeleteForecastResponse>;
    /**
      * Deletes an anomaly detection job. All job configuration, model state and results are deleted. It is not currently possible to delete multiple jobs using wildcards or a comma separated list. If you delete a job that has a datafeed, the request first tries to delete the datafeed. This behavior is equivalent to calling the delete datafeed API with the same timeout and force parameters as the delete job request.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-job.html | Elasticsearch API documentation}
      */
    deleteJob(this: That, params: T.MlDeleteJobRequest | TB.MlDeleteJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteJobResponse>;
    deleteJob(this: That, params: T.MlDeleteJobRequest | TB.MlDeleteJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteJobResponse, unknown>>;
    deleteJob(this: That, params: T.MlDeleteJobRequest | TB.MlDeleteJobRequest, options?: TransportRequestOptions): Promise<T.MlDeleteJobResponse>;
    /**
      * Deletes an existing model snapshot. You cannot delete the active model snapshot. To delete that snapshot, first revert to a different one. To identify the active model snapshot, refer to the `model_snapshot_id` in the results from the get jobs API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-delete-snapshot.html | Elasticsearch API documentation}
      */
    deleteModelSnapshot(this: That, params: T.MlDeleteModelSnapshotRequest | TB.MlDeleteModelSnapshotRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteModelSnapshotResponse>;
    deleteModelSnapshot(this: That, params: T.MlDeleteModelSnapshotRequest | TB.MlDeleteModelSnapshotRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteModelSnapshotResponse, unknown>>;
    deleteModelSnapshot(this: That, params: T.MlDeleteModelSnapshotRequest | TB.MlDeleteModelSnapshotRequest, options?: TransportRequestOptions): Promise<T.MlDeleteModelSnapshotResponse>;
    /**
      * Deletes an existing trained inference model that is currently not referenced by an ingest pipeline.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-trained-models.html | Elasticsearch API documentation}
      */
    deleteTrainedModel(this: That, params: T.MlDeleteTrainedModelRequest | TB.MlDeleteTrainedModelRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteTrainedModelResponse>;
    deleteTrainedModel(this: That, params: T.MlDeleteTrainedModelRequest | TB.MlDeleteTrainedModelRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteTrainedModelResponse, unknown>>;
    deleteTrainedModel(this: That, params: T.MlDeleteTrainedModelRequest | TB.MlDeleteTrainedModelRequest, options?: TransportRequestOptions): Promise<T.MlDeleteTrainedModelResponse>;
    /**
      * Deletes a trained model alias. This API deletes an existing model alias that refers to a trained model. If the model alias is missing or refers to a model other than the one identified by the `model_id`, this API returns an error.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-trained-models-aliases.html | Elasticsearch API documentation}
      */
    deleteTrainedModelAlias(this: That, params: T.MlDeleteTrainedModelAliasRequest | TB.MlDeleteTrainedModelAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlDeleteTrainedModelAliasResponse>;
    deleteTrainedModelAlias(this: That, params: T.MlDeleteTrainedModelAliasRequest | TB.MlDeleteTrainedModelAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlDeleteTrainedModelAliasResponse, unknown>>;
    deleteTrainedModelAlias(this: That, params: T.MlDeleteTrainedModelAliasRequest | TB.MlDeleteTrainedModelAliasRequest, options?: TransportRequestOptions): Promise<T.MlDeleteTrainedModelAliasResponse>;
    /**
      * Makes an estimation of the memory usage for an anomaly detection job model. It is based on analysis configuration details for the job and cardinality estimates for the fields it references.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-apis.html | Elasticsearch API documentation}
      */
    estimateModelMemory(this: That, params?: T.MlEstimateModelMemoryRequest | TB.MlEstimateModelMemoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlEstimateModelMemoryResponse>;
    estimateModelMemory(this: That, params?: T.MlEstimateModelMemoryRequest | TB.MlEstimateModelMemoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlEstimateModelMemoryResponse, unknown>>;
    estimateModelMemory(this: That, params?: T.MlEstimateModelMemoryRequest | TB.MlEstimateModelMemoryRequest, options?: TransportRequestOptions): Promise<T.MlEstimateModelMemoryResponse>;
    /**
      * Evaluates the data frame analytics for an annotated index. The API packages together commonly used evaluation metrics for various types of machine learning features. This has been designed for use on indexes created by data frame analytics. Evaluation requires both a ground truth field and an analytics result field to be present.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/evaluate-dfanalytics.html | Elasticsearch API documentation}
      */
    evaluateDataFrame(this: That, params: T.MlEvaluateDataFrameRequest | TB.MlEvaluateDataFrameRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlEvaluateDataFrameResponse>;
    evaluateDataFrame(this: That, params: T.MlEvaluateDataFrameRequest | TB.MlEvaluateDataFrameRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlEvaluateDataFrameResponse, unknown>>;
    evaluateDataFrame(this: That, params: T.MlEvaluateDataFrameRequest | TB.MlEvaluateDataFrameRequest, options?: TransportRequestOptions): Promise<T.MlEvaluateDataFrameResponse>;
    /**
      * Explains a data frame analytics config. This API provides explanations for a data frame analytics config that either exists already or one that has not been created yet. The following explanations are provided: * which fields are included or not in the analysis and why, * how much memory is estimated to be required. The estimate can be used when deciding the appropriate value for model_memory_limit setting later on. If you have object fields or fields that are excluded via source filtering, they are not included in the explanation.
      * @see {@link http://www.elastic.co/guide/en/elasticsearch/reference/8.15/explain-dfanalytics.html | Elasticsearch API documentation}
      */
    explainDataFrameAnalytics(this: That, params?: T.MlExplainDataFrameAnalyticsRequest | TB.MlExplainDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlExplainDataFrameAnalyticsResponse>;
    explainDataFrameAnalytics(this: That, params?: T.MlExplainDataFrameAnalyticsRequest | TB.MlExplainDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlExplainDataFrameAnalyticsResponse, unknown>>;
    explainDataFrameAnalytics(this: That, params?: T.MlExplainDataFrameAnalyticsRequest | TB.MlExplainDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlExplainDataFrameAnalyticsResponse>;
    /**
      * Forces any buffered data to be processed by the job. The flush jobs API is only applicable when sending data for analysis using the post data API. Depending on the content of the buffer, then it might additionally calculate new results. Both flush and close operations are similar, however the flush is more efficient if you are expecting to send more data for analysis. When flushing, the job remains open and is available to continue analyzing data. A close operation additionally prunes and persists the model state to disk and the job must be opened again before analyzing further data.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-flush-job.html | Elasticsearch API documentation}
      */
    flushJob(this: That, params: T.MlFlushJobRequest | TB.MlFlushJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlFlushJobResponse>;
    flushJob(this: That, params: T.MlFlushJobRequest | TB.MlFlushJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlFlushJobResponse, unknown>>;
    flushJob(this: That, params: T.MlFlushJobRequest | TB.MlFlushJobRequest, options?: TransportRequestOptions): Promise<T.MlFlushJobResponse>;
    /**
      * Predicts the future behavior of a time series by using its historical behavior. Forecasts are not supported for jobs that perform population analysis; an error occurs if you try to create a forecast for a job that has an `over_field_name` in its configuration.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-forecast.html | Elasticsearch API documentation}
      */
    forecast(this: That, params: T.MlForecastRequest | TB.MlForecastRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlForecastResponse>;
    forecast(this: That, params: T.MlForecastRequest | TB.MlForecastRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlForecastResponse, unknown>>;
    forecast(this: That, params: T.MlForecastRequest | TB.MlForecastRequest, options?: TransportRequestOptions): Promise<T.MlForecastResponse>;
    /**
      * Retrieves anomaly detection job results for one or more buckets. The API presents a chronological view of the records, grouped by bucket.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-bucket.html | Elasticsearch API documentation}
      */
    getBuckets(this: That, params: T.MlGetBucketsRequest | TB.MlGetBucketsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetBucketsResponse>;
    getBuckets(this: That, params: T.MlGetBucketsRequest | TB.MlGetBucketsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetBucketsResponse, unknown>>;
    getBuckets(this: That, params: T.MlGetBucketsRequest | TB.MlGetBucketsRequest, options?: TransportRequestOptions): Promise<T.MlGetBucketsResponse>;
    /**
      * Retrieves information about the scheduled events in calendars.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-calendar-event.html | Elasticsearch API documentation}
      */
    getCalendarEvents(this: That, params: T.MlGetCalendarEventsRequest | TB.MlGetCalendarEventsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetCalendarEventsResponse>;
    getCalendarEvents(this: That, params: T.MlGetCalendarEventsRequest | TB.MlGetCalendarEventsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetCalendarEventsResponse, unknown>>;
    getCalendarEvents(this: That, params: T.MlGetCalendarEventsRequest | TB.MlGetCalendarEventsRequest, options?: TransportRequestOptions): Promise<T.MlGetCalendarEventsResponse>;
    /**
      * Retrieves configuration information for calendars.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-calendar.html | Elasticsearch API documentation}
      */
    getCalendars(this: That, params?: T.MlGetCalendarsRequest | TB.MlGetCalendarsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetCalendarsResponse>;
    getCalendars(this: That, params?: T.MlGetCalendarsRequest | TB.MlGetCalendarsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetCalendarsResponse, unknown>>;
    getCalendars(this: That, params?: T.MlGetCalendarsRequest | TB.MlGetCalendarsRequest, options?: TransportRequestOptions): Promise<T.MlGetCalendarsResponse>;
    /**
      * Retrieves anomaly detection job results for one or more categories.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-category.html | Elasticsearch API documentation}
      */
    getCategories(this: That, params: T.MlGetCategoriesRequest | TB.MlGetCategoriesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetCategoriesResponse>;
    getCategories(this: That, params: T.MlGetCategoriesRequest | TB.MlGetCategoriesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetCategoriesResponse, unknown>>;
    getCategories(this: That, params: T.MlGetCategoriesRequest | TB.MlGetCategoriesRequest, options?: TransportRequestOptions): Promise<T.MlGetCategoriesResponse>;
    /**
      * Retrieves configuration information for data frame analytics jobs. You can get information for multiple data frame analytics jobs in a single API request by using a comma-separated list of data frame analytics jobs or a wildcard expression.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-dfanalytics.html | Elasticsearch API documentation}
      */
    getDataFrameAnalytics(this: That, params?: T.MlGetDataFrameAnalyticsRequest | TB.MlGetDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetDataFrameAnalyticsResponse>;
    getDataFrameAnalytics(this: That, params?: T.MlGetDataFrameAnalyticsRequest | TB.MlGetDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetDataFrameAnalyticsResponse, unknown>>;
    getDataFrameAnalytics(this: That, params?: T.MlGetDataFrameAnalyticsRequest | TB.MlGetDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlGetDataFrameAnalyticsResponse>;
    /**
      * Retrieves usage information for data frame analytics jobs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-dfanalytics-stats.html | Elasticsearch API documentation}
      */
    getDataFrameAnalyticsStats(this: That, params?: T.MlGetDataFrameAnalyticsStatsRequest | TB.MlGetDataFrameAnalyticsStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetDataFrameAnalyticsStatsResponse>;
    getDataFrameAnalyticsStats(this: That, params?: T.MlGetDataFrameAnalyticsStatsRequest | TB.MlGetDataFrameAnalyticsStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetDataFrameAnalyticsStatsResponse, unknown>>;
    getDataFrameAnalyticsStats(this: That, params?: T.MlGetDataFrameAnalyticsStatsRequest | TB.MlGetDataFrameAnalyticsStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetDataFrameAnalyticsStatsResponse>;
    /**
      * Retrieves usage information for datafeeds. You can get statistics for multiple datafeeds in a single API request by using a comma-separated list of datafeeds or a wildcard expression. You can get statistics for all datafeeds by using `_all`, by specifying `*` as the `<feed_id>`, or by omitting the `<feed_id>`. If the datafeed is stopped, the only information you receive is the `datafeed_id` and the `state`. This API returns a maximum of 10,000 datafeeds.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-datafeed-stats.html | Elasticsearch API documentation}
      */
    getDatafeedStats(this: That, params?: T.MlGetDatafeedStatsRequest | TB.MlGetDatafeedStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetDatafeedStatsResponse>;
    getDatafeedStats(this: That, params?: T.MlGetDatafeedStatsRequest | TB.MlGetDatafeedStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetDatafeedStatsResponse, unknown>>;
    getDatafeedStats(this: That, params?: T.MlGetDatafeedStatsRequest | TB.MlGetDatafeedStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetDatafeedStatsResponse>;
    /**
      * Retrieves configuration information for datafeeds. You can get information for multiple datafeeds in a single API request by using a comma-separated list of datafeeds or a wildcard expression. You can get information for all datafeeds by using `_all`, by specifying `*` as the `<feed_id>`, or by omitting the `<feed_id>`. This API returns a maximum of 10,000 datafeeds.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-datafeed.html | Elasticsearch API documentation}
      */
    getDatafeeds(this: That, params?: T.MlGetDatafeedsRequest | TB.MlGetDatafeedsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetDatafeedsResponse>;
    getDatafeeds(this: That, params?: T.MlGetDatafeedsRequest | TB.MlGetDatafeedsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetDatafeedsResponse, unknown>>;
    getDatafeeds(this: That, params?: T.MlGetDatafeedsRequest | TB.MlGetDatafeedsRequest, options?: TransportRequestOptions): Promise<T.MlGetDatafeedsResponse>;
    /**
      * Retrieves filters. You can get a single filter or all filters.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-filter.html | Elasticsearch API documentation}
      */
    getFilters(this: That, params?: T.MlGetFiltersRequest | TB.MlGetFiltersRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetFiltersResponse>;
    getFilters(this: That, params?: T.MlGetFiltersRequest | TB.MlGetFiltersRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetFiltersResponse, unknown>>;
    getFilters(this: That, params?: T.MlGetFiltersRequest | TB.MlGetFiltersRequest, options?: TransportRequestOptions): Promise<T.MlGetFiltersResponse>;
    /**
      * Retrieves anomaly detection job results for one or more influencers. Influencers are the entities that have contributed to, or are to blame for, the anomalies. Influencer results are available only if an `influencer_field_name` is specified in the job configuration.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-influencer.html | Elasticsearch API documentation}
      */
    getInfluencers(this: That, params: T.MlGetInfluencersRequest | TB.MlGetInfluencersRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetInfluencersResponse>;
    getInfluencers(this: That, params: T.MlGetInfluencersRequest | TB.MlGetInfluencersRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetInfluencersResponse, unknown>>;
    getInfluencers(this: That, params: T.MlGetInfluencersRequest | TB.MlGetInfluencersRequest, options?: TransportRequestOptions): Promise<T.MlGetInfluencersResponse>;
    /**
      * Retrieves usage information for anomaly detection jobs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-job-stats.html | Elasticsearch API documentation}
      */
    getJobStats(this: That, params?: T.MlGetJobStatsRequest | TB.MlGetJobStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetJobStatsResponse>;
    getJobStats(this: That, params?: T.MlGetJobStatsRequest | TB.MlGetJobStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetJobStatsResponse, unknown>>;
    getJobStats(this: That, params?: T.MlGetJobStatsRequest | TB.MlGetJobStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetJobStatsResponse>;
    /**
      * Retrieves configuration information for anomaly detection jobs. You can get information for multiple anomaly detection jobs in a single API request by using a group name, a comma-separated list of jobs, or a wildcard expression. You can get information for all anomaly detection jobs by using `_all`, by specifying `*` as the `<job_id>`, or by omitting the `<job_id>`.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-job.html | Elasticsearch API documentation}
      */
    getJobs(this: That, params?: T.MlGetJobsRequest | TB.MlGetJobsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetJobsResponse>;
    getJobs(this: That, params?: T.MlGetJobsRequest | TB.MlGetJobsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetJobsResponse, unknown>>;
    getJobs(this: That, params?: T.MlGetJobsRequest | TB.MlGetJobsRequest, options?: TransportRequestOptions): Promise<T.MlGetJobsResponse>;
    /**
      * Get information about how machine learning jobs and trained models are using memory, on each node, both within the JVM heap, and natively, outside of the JVM.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-ml-memory.html | Elasticsearch API documentation}
      */
    getMemoryStats(this: That, params?: T.MlGetMemoryStatsRequest | TB.MlGetMemoryStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetMemoryStatsResponse>;
    getMemoryStats(this: That, params?: T.MlGetMemoryStatsRequest | TB.MlGetMemoryStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetMemoryStatsResponse, unknown>>;
    getMemoryStats(this: That, params?: T.MlGetMemoryStatsRequest | TB.MlGetMemoryStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetMemoryStatsResponse>;
    /**
      * Retrieves usage information for anomaly detection job model snapshot upgrades.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-job-model-snapshot-upgrade-stats.html | Elasticsearch API documentation}
      */
    getModelSnapshotUpgradeStats(this: That, params: T.MlGetModelSnapshotUpgradeStatsRequest | TB.MlGetModelSnapshotUpgradeStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetModelSnapshotUpgradeStatsResponse>;
    getModelSnapshotUpgradeStats(this: That, params: T.MlGetModelSnapshotUpgradeStatsRequest | TB.MlGetModelSnapshotUpgradeStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetModelSnapshotUpgradeStatsResponse, unknown>>;
    getModelSnapshotUpgradeStats(this: That, params: T.MlGetModelSnapshotUpgradeStatsRequest | TB.MlGetModelSnapshotUpgradeStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetModelSnapshotUpgradeStatsResponse>;
    /**
      * Retrieves information about model snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-snapshot.html | Elasticsearch API documentation}
      */
    getModelSnapshots(this: That, params: T.MlGetModelSnapshotsRequest | TB.MlGetModelSnapshotsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetModelSnapshotsResponse>;
    getModelSnapshots(this: That, params: T.MlGetModelSnapshotsRequest | TB.MlGetModelSnapshotsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetModelSnapshotsResponse, unknown>>;
    getModelSnapshots(this: That, params: T.MlGetModelSnapshotsRequest | TB.MlGetModelSnapshotsRequest, options?: TransportRequestOptions): Promise<T.MlGetModelSnapshotsResponse>;
    /**
      * Retrieves overall bucket results that summarize the bucket results of multiple anomaly detection jobs. The `overall_score` is calculated by combining the scores of all the buckets within the overall bucket span. First, the maximum `anomaly_score` per anomaly detection job in the overall bucket is calculated. Then the `top_n` of those scores are averaged to result in the `overall_score`. This means that you can fine-tune the `overall_score` so that it is more or less sensitive to the number of jobs that detect an anomaly at the same time. For example, if you set `top_n` to `1`, the `overall_score` is the maximum bucket score in the overall bucket. Alternatively, if you set `top_n` to the number of jobs, the `overall_score` is high only when all jobs detect anomalies in that overall bucket. If you set the `bucket_span` parameter (to a value greater than its default), the `overall_score` is the maximum `overall_score` of the overall buckets that have a span equal to the jobs' largest bucket span.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-overall-buckets.html | Elasticsearch API documentation}
      */
    getOverallBuckets(this: That, params: T.MlGetOverallBucketsRequest | TB.MlGetOverallBucketsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetOverallBucketsResponse>;
    getOverallBuckets(this: That, params: T.MlGetOverallBucketsRequest | TB.MlGetOverallBucketsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetOverallBucketsResponse, unknown>>;
    getOverallBuckets(this: That, params: T.MlGetOverallBucketsRequest | TB.MlGetOverallBucketsRequest, options?: TransportRequestOptions): Promise<T.MlGetOverallBucketsResponse>;
    /**
      * Retrieves anomaly records for an anomaly detection job. Records contain the detailed analytical results. They describe the anomalous activity that has been identified in the input data based on the detector configuration. There can be many anomaly records depending on the characteristics and size of the input data. In practice, there are often too many to be able to manually process them. The machine learning features therefore perform a sophisticated aggregation of the anomaly records into buckets. The number of record results depends on the number of anomalies found in each bucket, which relates to the number of time series being modeled and the number of detectors.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-get-record.html | Elasticsearch API documentation}
      */
    getRecords(this: That, params: T.MlGetRecordsRequest | TB.MlGetRecordsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetRecordsResponse>;
    getRecords(this: That, params: T.MlGetRecordsRequest | TB.MlGetRecordsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetRecordsResponse, unknown>>;
    getRecords(this: That, params: T.MlGetRecordsRequest | TB.MlGetRecordsRequest, options?: TransportRequestOptions): Promise<T.MlGetRecordsResponse>;
    /**
      * Retrieves configuration information for a trained model.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-trained-models.html | Elasticsearch API documentation}
      */
    getTrainedModels(this: That, params?: T.MlGetTrainedModelsRequest | TB.MlGetTrainedModelsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetTrainedModelsResponse>;
    getTrainedModels(this: That, params?: T.MlGetTrainedModelsRequest | TB.MlGetTrainedModelsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetTrainedModelsResponse, unknown>>;
    getTrainedModels(this: That, params?: T.MlGetTrainedModelsRequest | TB.MlGetTrainedModelsRequest, options?: TransportRequestOptions): Promise<T.MlGetTrainedModelsResponse>;
    /**
      * Retrieves usage information for trained models. You can get usage information for multiple trained models in a single API request by using a comma-separated list of model IDs or a wildcard expression.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-trained-models-stats.html | Elasticsearch API documentation}
      */
    getTrainedModelsStats(this: That, params?: T.MlGetTrainedModelsStatsRequest | TB.MlGetTrainedModelsStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlGetTrainedModelsStatsResponse>;
    getTrainedModelsStats(this: That, params?: T.MlGetTrainedModelsStatsRequest | TB.MlGetTrainedModelsStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlGetTrainedModelsStatsResponse, unknown>>;
    getTrainedModelsStats(this: That, params?: T.MlGetTrainedModelsStatsRequest | TB.MlGetTrainedModelsStatsRequest, options?: TransportRequestOptions): Promise<T.MlGetTrainedModelsStatsResponse>;
    /**
      * Evaluates a trained model.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/infer-trained-model.html | Elasticsearch API documentation}
      */
    inferTrainedModel(this: That, params: T.MlInferTrainedModelRequest | TB.MlInferTrainedModelRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlInferTrainedModelResponse>;
    inferTrainedModel(this: That, params: T.MlInferTrainedModelRequest | TB.MlInferTrainedModelRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlInferTrainedModelResponse, unknown>>;
    inferTrainedModel(this: That, params: T.MlInferTrainedModelRequest | TB.MlInferTrainedModelRequest, options?: TransportRequestOptions): Promise<T.MlInferTrainedModelResponse>;
    /**
      * Returns defaults and limits used by machine learning. This endpoint is designed to be used by a user interface that needs to fully understand machine learning configurations where some options are not specified, meaning that the defaults should be used. This endpoint may be used to find out what those defaults are. It also provides information about the maximum size of machine learning jobs that could run in the current cluster configuration.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-ml-info.html | Elasticsearch API documentation}
      */
    info(this: That, params?: T.MlInfoRequest | TB.MlInfoRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlInfoResponse>;
    info(this: That, params?: T.MlInfoRequest | TB.MlInfoRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlInfoResponse, unknown>>;
    info(this: That, params?: T.MlInfoRequest | TB.MlInfoRequest, options?: TransportRequestOptions): Promise<T.MlInfoResponse>;
    /**
      * Opens one or more anomaly detection jobs. An anomaly detection job must be opened in order for it to be ready to receive and analyze data. It can be opened and closed multiple times throughout its lifecycle. When you open a new job, it starts with an empty model. When you open an existing job, the most recent model state is automatically loaded. The job is ready to resume its analysis from where it left off, once new data is received.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-open-job.html | Elasticsearch API documentation}
      */
    openJob(this: That, params: T.MlOpenJobRequest | TB.MlOpenJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlOpenJobResponse>;
    openJob(this: That, params: T.MlOpenJobRequest | TB.MlOpenJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlOpenJobResponse, unknown>>;
    openJob(this: That, params: T.MlOpenJobRequest | TB.MlOpenJobRequest, options?: TransportRequestOptions): Promise<T.MlOpenJobResponse>;
    /**
      * Adds scheduled events to a calendar.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-post-calendar-event.html | Elasticsearch API documentation}
      */
    postCalendarEvents(this: That, params: T.MlPostCalendarEventsRequest | TB.MlPostCalendarEventsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPostCalendarEventsResponse>;
    postCalendarEvents(this: That, params: T.MlPostCalendarEventsRequest | TB.MlPostCalendarEventsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPostCalendarEventsResponse, unknown>>;
    postCalendarEvents(this: That, params: T.MlPostCalendarEventsRequest | TB.MlPostCalendarEventsRequest, options?: TransportRequestOptions): Promise<T.MlPostCalendarEventsResponse>;
    /**
      * Sends data to an anomaly detection job for analysis. IMPORTANT: For each job, data can be accepted from only a single connection at a time. It is not currently possible to post data to multiple jobs using wildcards or a comma-separated list.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-post-data.html | Elasticsearch API documentation}
      */
    postData<TData = unknown>(this: That, params: T.MlPostDataRequest<TData> | TB.MlPostDataRequest<TData>, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPostDataResponse>;
    postData<TData = unknown>(this: That, params: T.MlPostDataRequest<TData> | TB.MlPostDataRequest<TData>, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPostDataResponse, unknown>>;
    postData<TData = unknown>(this: That, params: T.MlPostDataRequest<TData> | TB.MlPostDataRequest<TData>, options?: TransportRequestOptions): Promise<T.MlPostDataResponse>;
    /**
      * Previews the extracted features used by a data frame analytics config.
      * @see {@link http://www.elastic.co/guide/en/elasticsearch/reference/8.15/preview-dfanalytics.html | Elasticsearch API documentation}
      */
    previewDataFrameAnalytics(this: That, params?: T.MlPreviewDataFrameAnalyticsRequest | TB.MlPreviewDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPreviewDataFrameAnalyticsResponse>;
    previewDataFrameAnalytics(this: That, params?: T.MlPreviewDataFrameAnalyticsRequest | TB.MlPreviewDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPreviewDataFrameAnalyticsResponse, unknown>>;
    previewDataFrameAnalytics(this: That, params?: T.MlPreviewDataFrameAnalyticsRequest | TB.MlPreviewDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlPreviewDataFrameAnalyticsResponse>;
    /**
      * Previews a datafeed. This API returns the first "page" of search results from a datafeed. You can preview an existing datafeed or provide configuration details for a datafeed and anomaly detection job in the API. The preview shows the structure of the data that will be passed to the anomaly detection engine. IMPORTANT: When Elasticsearch security features are enabled, the preview uses the credentials of the user that called the API. However, when the datafeed starts it uses the roles of the last user that created or updated the datafeed. To get a preview that accurately reflects the behavior of the datafeed, use the appropriate credentials. You can also use secondary authorization headers to supply the credentials.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-preview-datafeed.html | Elasticsearch API documentation}
      */
    previewDatafeed<TDocument = unknown>(this: That, params?: T.MlPreviewDatafeedRequest | TB.MlPreviewDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPreviewDatafeedResponse<TDocument>>;
    previewDatafeed<TDocument = unknown>(this: That, params?: T.MlPreviewDatafeedRequest | TB.MlPreviewDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPreviewDatafeedResponse<TDocument>, unknown>>;
    previewDatafeed<TDocument = unknown>(this: That, params?: T.MlPreviewDatafeedRequest | TB.MlPreviewDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlPreviewDatafeedResponse<TDocument>>;
    /**
      * Creates a calendar.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-put-calendar.html | Elasticsearch API documentation}
      */
    putCalendar(this: That, params: T.MlPutCalendarRequest | TB.MlPutCalendarRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutCalendarResponse>;
    putCalendar(this: That, params: T.MlPutCalendarRequest | TB.MlPutCalendarRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutCalendarResponse, unknown>>;
    putCalendar(this: That, params: T.MlPutCalendarRequest | TB.MlPutCalendarRequest, options?: TransportRequestOptions): Promise<T.MlPutCalendarResponse>;
    /**
      * Adds an anomaly detection job to a calendar.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-put-calendar-job.html | Elasticsearch API documentation}
      */
    putCalendarJob(this: That, params: T.MlPutCalendarJobRequest | TB.MlPutCalendarJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutCalendarJobResponse>;
    putCalendarJob(this: That, params: T.MlPutCalendarJobRequest | TB.MlPutCalendarJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutCalendarJobResponse, unknown>>;
    putCalendarJob(this: That, params: T.MlPutCalendarJobRequest | TB.MlPutCalendarJobRequest, options?: TransportRequestOptions): Promise<T.MlPutCalendarJobResponse>;
    /**
      * Instantiates a data frame analytics job. This API creates a data frame analytics job that performs an analysis on the source indices and stores the outcome in a destination index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-dfanalytics.html | Elasticsearch API documentation}
      */
    putDataFrameAnalytics(this: That, params: T.MlPutDataFrameAnalyticsRequest | TB.MlPutDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutDataFrameAnalyticsResponse>;
    putDataFrameAnalytics(this: That, params: T.MlPutDataFrameAnalyticsRequest | TB.MlPutDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutDataFrameAnalyticsResponse, unknown>>;
    putDataFrameAnalytics(this: That, params: T.MlPutDataFrameAnalyticsRequest | TB.MlPutDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlPutDataFrameAnalyticsResponse>;
    /**
      * Instantiates a datafeed. Datafeeds retrieve data from Elasticsearch for analysis by an anomaly detection job. You can associate only one datafeed with each anomaly detection job. The datafeed contains a query that runs at a defined interval (`frequency`). If you are concerned about delayed data, you can add a delay (`query_delay') at each interval. When Elasticsearch security features are enabled, your datafeed remembers which roles the user who created it had at the time of creation and runs the query using those same roles. If you provide secondary authorization headers, those credentials are used instead. You must use Kibana, this API, or the create anomaly detection jobs API to create a datafeed. Do not add a datafeed directly to the `.ml-config` index. Do not give users `write` privileges on the `.ml-config` index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-put-datafeed.html | Elasticsearch API documentation}
      */
    putDatafeed(this: That, params: T.MlPutDatafeedRequest | TB.MlPutDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutDatafeedResponse>;
    putDatafeed(this: That, params: T.MlPutDatafeedRequest | TB.MlPutDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutDatafeedResponse, unknown>>;
    putDatafeed(this: That, params: T.MlPutDatafeedRequest | TB.MlPutDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlPutDatafeedResponse>;
    /**
      * Instantiates a filter. A filter contains a list of strings. It can be used by one or more anomaly detection jobs. Specifically, filters are referenced in the `custom_rules` property of detector configuration objects.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-put-filter.html | Elasticsearch API documentation}
      */
    putFilter(this: That, params: T.MlPutFilterRequest | TB.MlPutFilterRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutFilterResponse>;
    putFilter(this: That, params: T.MlPutFilterRequest | TB.MlPutFilterRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutFilterResponse, unknown>>;
    putFilter(this: That, params: T.MlPutFilterRequest | TB.MlPutFilterRequest, options?: TransportRequestOptions): Promise<T.MlPutFilterResponse>;
    /**
      * Instantiates an anomaly detection job. If you include a `datafeed_config`, you must have read index privileges on the source index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-put-job.html | Elasticsearch API documentation}
      */
    putJob(this: That, params: T.MlPutJobRequest | TB.MlPutJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutJobResponse>;
    putJob(this: That, params: T.MlPutJobRequest | TB.MlPutJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutJobResponse, unknown>>;
    putJob(this: That, params: T.MlPutJobRequest | TB.MlPutJobRequest, options?: TransportRequestOptions): Promise<T.MlPutJobResponse>;
    /**
      * Enables you to supply a trained model that is not created by data frame analytics.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-trained-models.html | Elasticsearch API documentation}
      */
    putTrainedModel(this: That, params: T.MlPutTrainedModelRequest | TB.MlPutTrainedModelRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutTrainedModelResponse>;
    putTrainedModel(this: That, params: T.MlPutTrainedModelRequest | TB.MlPutTrainedModelRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutTrainedModelResponse, unknown>>;
    putTrainedModel(this: That, params: T.MlPutTrainedModelRequest | TB.MlPutTrainedModelRequest, options?: TransportRequestOptions): Promise<T.MlPutTrainedModelResponse>;
    /**
      * Creates or updates a trained model alias. A trained model alias is a logical name used to reference a single trained model. You can use aliases instead of trained model identifiers to make it easier to reference your models. For example, you can use aliases in inference aggregations and processors. An alias must be unique and refer to only a single trained model. However, you can have multiple aliases for each trained model. If you use this API to update an alias such that it references a different trained model ID and the model uses a different type of data frame analytics, an error occurs. For example, this situation occurs if you have a trained model for regression analysis and a trained model for classification analysis; you cannot reassign an alias from one type of trained model to another. If you use this API to update an alias and there are very few input fields in common between the old and new trained models for the model alias, the API returns a warning.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-trained-models-aliases.html | Elasticsearch API documentation}
      */
    putTrainedModelAlias(this: That, params: T.MlPutTrainedModelAliasRequest | TB.MlPutTrainedModelAliasRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutTrainedModelAliasResponse>;
    putTrainedModelAlias(this: That, params: T.MlPutTrainedModelAliasRequest | TB.MlPutTrainedModelAliasRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutTrainedModelAliasResponse, unknown>>;
    putTrainedModelAlias(this: That, params: T.MlPutTrainedModelAliasRequest | TB.MlPutTrainedModelAliasRequest, options?: TransportRequestOptions): Promise<T.MlPutTrainedModelAliasResponse>;
    /**
      * Creates part of a trained model definition.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-trained-model-definition-part.html | Elasticsearch API documentation}
      */
    putTrainedModelDefinitionPart(this: That, params: T.MlPutTrainedModelDefinitionPartRequest | TB.MlPutTrainedModelDefinitionPartRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutTrainedModelDefinitionPartResponse>;
    putTrainedModelDefinitionPart(this: That, params: T.MlPutTrainedModelDefinitionPartRequest | TB.MlPutTrainedModelDefinitionPartRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutTrainedModelDefinitionPartResponse, unknown>>;
    putTrainedModelDefinitionPart(this: That, params: T.MlPutTrainedModelDefinitionPartRequest | TB.MlPutTrainedModelDefinitionPartRequest, options?: TransportRequestOptions): Promise<T.MlPutTrainedModelDefinitionPartResponse>;
    /**
      * Creates a trained model vocabulary. This API is supported only for natural language processing (NLP) models. The vocabulary is stored in the index as described in `inference_config.*.vocabulary` of the trained model definition.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-trained-model-vocabulary.html | Elasticsearch API documentation}
      */
    putTrainedModelVocabulary(this: That, params: T.MlPutTrainedModelVocabularyRequest | TB.MlPutTrainedModelVocabularyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlPutTrainedModelVocabularyResponse>;
    putTrainedModelVocabulary(this: That, params: T.MlPutTrainedModelVocabularyRequest | TB.MlPutTrainedModelVocabularyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlPutTrainedModelVocabularyResponse, unknown>>;
    putTrainedModelVocabulary(this: That, params: T.MlPutTrainedModelVocabularyRequest | TB.MlPutTrainedModelVocabularyRequest, options?: TransportRequestOptions): Promise<T.MlPutTrainedModelVocabularyResponse>;
    /**
      * Resets an anomaly detection job. All model state and results are deleted. The job is ready to start over as if it had just been created. It is not currently possible to reset multiple jobs using wildcards or a comma separated list.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-reset-job.html | Elasticsearch API documentation}
      */
    resetJob(this: That, params: T.MlResetJobRequest | TB.MlResetJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlResetJobResponse>;
    resetJob(this: That, params: T.MlResetJobRequest | TB.MlResetJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlResetJobResponse, unknown>>;
    resetJob(this: That, params: T.MlResetJobRequest | TB.MlResetJobRequest, options?: TransportRequestOptions): Promise<T.MlResetJobResponse>;
    /**
      * Reverts to a specific snapshot. The machine learning features react quickly to anomalous input, learning new behaviors in data. Highly anomalous input increases the variance in the models whilst the system learns whether this is a new step-change in behavior or a one-off event. In the case where this anomalous input is known to be a one-off, then it might be appropriate to reset the model state to a time before this event. For example, you might consider reverting to a saved snapshot after Black Friday or a critical system failure.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-revert-snapshot.html | Elasticsearch API documentation}
      */
    revertModelSnapshot(this: That, params: T.MlRevertModelSnapshotRequest | TB.MlRevertModelSnapshotRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlRevertModelSnapshotResponse>;
    revertModelSnapshot(this: That, params: T.MlRevertModelSnapshotRequest | TB.MlRevertModelSnapshotRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlRevertModelSnapshotResponse, unknown>>;
    revertModelSnapshot(this: That, params: T.MlRevertModelSnapshotRequest | TB.MlRevertModelSnapshotRequest, options?: TransportRequestOptions): Promise<T.MlRevertModelSnapshotResponse>;
    /**
      * Sets a cluster wide upgrade_mode setting that prepares machine learning indices for an upgrade. When upgrading your cluster, in some circumstances you must restart your nodes and reindex your machine learning indices. In those circumstances, there must be no machine learning jobs running. You can close the machine learning jobs, do the upgrade, then open all the jobs again. Alternatively, you can use this API to temporarily halt tasks associated with the jobs and datafeeds and prevent new jobs from opening. You can also use this API during upgrades that do not require you to reindex your machine learning indices, though stopping jobs is not a requirement in that case. You can see the current value for the upgrade_mode setting by using the get machine learning info API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-set-upgrade-mode.html | Elasticsearch API documentation}
      */
    setUpgradeMode(this: That, params?: T.MlSetUpgradeModeRequest | TB.MlSetUpgradeModeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlSetUpgradeModeResponse>;
    setUpgradeMode(this: That, params?: T.MlSetUpgradeModeRequest | TB.MlSetUpgradeModeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlSetUpgradeModeResponse, unknown>>;
    setUpgradeMode(this: That, params?: T.MlSetUpgradeModeRequest | TB.MlSetUpgradeModeRequest, options?: TransportRequestOptions): Promise<T.MlSetUpgradeModeResponse>;
    /**
      * Starts a data frame analytics job. A data frame analytics job can be started and stopped multiple times throughout its lifecycle. If the destination index does not exist, it is created automatically the first time you start the data frame analytics job. The `index.number_of_shards` and `index.number_of_replicas` settings for the destination index are copied from the source index. If there are multiple source indices, the destination index copies the highest setting values. The mappings for the destination index are also copied from the source indices. If there are any mapping conflicts, the job fails to start. If the destination index exists, it is used as is. You can therefore set up the destination index in advance with custom settings and mappings.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/start-dfanalytics.html | Elasticsearch API documentation}
      */
    startDataFrameAnalytics(this: That, params: T.MlStartDataFrameAnalyticsRequest | TB.MlStartDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStartDataFrameAnalyticsResponse>;
    startDataFrameAnalytics(this: That, params: T.MlStartDataFrameAnalyticsRequest | TB.MlStartDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStartDataFrameAnalyticsResponse, unknown>>;
    startDataFrameAnalytics(this: That, params: T.MlStartDataFrameAnalyticsRequest | TB.MlStartDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlStartDataFrameAnalyticsResponse>;
    /**
      * Starts one or more datafeeds. A datafeed must be started in order to retrieve data from Elasticsearch. A datafeed can be started and stopped multiple times throughout its lifecycle. Before you can start a datafeed, the anomaly detection job must be open. Otherwise, an error occurs. If you restart a stopped datafeed, it continues processing input data from the next millisecond after it was stopped. If new data was indexed for that exact millisecond between stopping and starting, it will be ignored. When Elasticsearch security features are enabled, your datafeed remembers which roles the last user to create or update it had at the time of creation or update and runs the query using those same roles. If you provided secondary authorization headers when you created or updated the datafeed, those credentials are used instead.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-start-datafeed.html | Elasticsearch API documentation}
      */
    startDatafeed(this: That, params: T.MlStartDatafeedRequest | TB.MlStartDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStartDatafeedResponse>;
    startDatafeed(this: That, params: T.MlStartDatafeedRequest | TB.MlStartDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStartDatafeedResponse, unknown>>;
    startDatafeed(this: That, params: T.MlStartDatafeedRequest | TB.MlStartDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlStartDatafeedResponse>;
    /**
      * Starts a trained model deployment, which allocates the model to every machine learning node.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/start-trained-model-deployment.html | Elasticsearch API documentation}
      */
    startTrainedModelDeployment(this: That, params: T.MlStartTrainedModelDeploymentRequest | TB.MlStartTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStartTrainedModelDeploymentResponse>;
    startTrainedModelDeployment(this: That, params: T.MlStartTrainedModelDeploymentRequest | TB.MlStartTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStartTrainedModelDeploymentResponse, unknown>>;
    startTrainedModelDeployment(this: That, params: T.MlStartTrainedModelDeploymentRequest | TB.MlStartTrainedModelDeploymentRequest, options?: TransportRequestOptions): Promise<T.MlStartTrainedModelDeploymentResponse>;
    /**
      * Stops one or more data frame analytics jobs. A data frame analytics job can be started and stopped multiple times throughout its lifecycle.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/stop-dfanalytics.html | Elasticsearch API documentation}
      */
    stopDataFrameAnalytics(this: That, params: T.MlStopDataFrameAnalyticsRequest | TB.MlStopDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStopDataFrameAnalyticsResponse>;
    stopDataFrameAnalytics(this: That, params: T.MlStopDataFrameAnalyticsRequest | TB.MlStopDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStopDataFrameAnalyticsResponse, unknown>>;
    stopDataFrameAnalytics(this: That, params: T.MlStopDataFrameAnalyticsRequest | TB.MlStopDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlStopDataFrameAnalyticsResponse>;
    /**
      * Stops one or more datafeeds. A datafeed that is stopped ceases to retrieve data from Elasticsearch. A datafeed can be started and stopped multiple times throughout its lifecycle.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-stop-datafeed.html | Elasticsearch API documentation}
      */
    stopDatafeed(this: That, params: T.MlStopDatafeedRequest | TB.MlStopDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStopDatafeedResponse>;
    stopDatafeed(this: That, params: T.MlStopDatafeedRequest | TB.MlStopDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStopDatafeedResponse, unknown>>;
    stopDatafeed(this: That, params: T.MlStopDatafeedRequest | TB.MlStopDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlStopDatafeedResponse>;
    /**
      * Stops a trained model deployment.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/stop-trained-model-deployment.html | Elasticsearch API documentation}
      */
    stopTrainedModelDeployment(this: That, params: T.MlStopTrainedModelDeploymentRequest | TB.MlStopTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlStopTrainedModelDeploymentResponse>;
    stopTrainedModelDeployment(this: That, params: T.MlStopTrainedModelDeploymentRequest | TB.MlStopTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlStopTrainedModelDeploymentResponse, unknown>>;
    stopTrainedModelDeployment(this: That, params: T.MlStopTrainedModelDeploymentRequest | TB.MlStopTrainedModelDeploymentRequest, options?: TransportRequestOptions): Promise<T.MlStopTrainedModelDeploymentResponse>;
    /**
      * Updates an existing data frame analytics job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-dfanalytics.html | Elasticsearch API documentation}
      */
    updateDataFrameAnalytics(this: That, params: T.MlUpdateDataFrameAnalyticsRequest | TB.MlUpdateDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateDataFrameAnalyticsResponse>;
    updateDataFrameAnalytics(this: That, params: T.MlUpdateDataFrameAnalyticsRequest | TB.MlUpdateDataFrameAnalyticsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateDataFrameAnalyticsResponse, unknown>>;
    updateDataFrameAnalytics(this: That, params: T.MlUpdateDataFrameAnalyticsRequest | TB.MlUpdateDataFrameAnalyticsRequest, options?: TransportRequestOptions): Promise<T.MlUpdateDataFrameAnalyticsResponse>;
    /**
      * Updates the properties of a datafeed. You must stop and start the datafeed for the changes to be applied. When Elasticsearch security features are enabled, your datafeed remembers which roles the user who updated it had at the time of the update and runs the query using those same roles. If you provide secondary authorization headers, those credentials are used instead.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-update-datafeed.html | Elasticsearch API documentation}
      */
    updateDatafeed(this: That, params: T.MlUpdateDatafeedRequest | TB.MlUpdateDatafeedRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateDatafeedResponse>;
    updateDatafeed(this: That, params: T.MlUpdateDatafeedRequest | TB.MlUpdateDatafeedRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateDatafeedResponse, unknown>>;
    updateDatafeed(this: That, params: T.MlUpdateDatafeedRequest | TB.MlUpdateDatafeedRequest, options?: TransportRequestOptions): Promise<T.MlUpdateDatafeedResponse>;
    /**
      * Updates the description of a filter, adds items, or removes items from the list.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-update-filter.html | Elasticsearch API documentation}
      */
    updateFilter(this: That, params: T.MlUpdateFilterRequest | TB.MlUpdateFilterRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateFilterResponse>;
    updateFilter(this: That, params: T.MlUpdateFilterRequest | TB.MlUpdateFilterRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateFilterResponse, unknown>>;
    updateFilter(this: That, params: T.MlUpdateFilterRequest | TB.MlUpdateFilterRequest, options?: TransportRequestOptions): Promise<T.MlUpdateFilterResponse>;
    /**
      * Updates certain properties of an anomaly detection job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-update-job.html | Elasticsearch API documentation}
      */
    updateJob(this: That, params: T.MlUpdateJobRequest | TB.MlUpdateJobRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateJobResponse>;
    updateJob(this: That, params: T.MlUpdateJobRequest | TB.MlUpdateJobRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateJobResponse, unknown>>;
    updateJob(this: That, params: T.MlUpdateJobRequest | TB.MlUpdateJobRequest, options?: TransportRequestOptions): Promise<T.MlUpdateJobResponse>;
    /**
      * Updates certain properties of a snapshot.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-update-snapshot.html | Elasticsearch API documentation}
      */
    updateModelSnapshot(this: That, params: T.MlUpdateModelSnapshotRequest | TB.MlUpdateModelSnapshotRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateModelSnapshotResponse>;
    updateModelSnapshot(this: That, params: T.MlUpdateModelSnapshotRequest | TB.MlUpdateModelSnapshotRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateModelSnapshotResponse, unknown>>;
    updateModelSnapshot(this: That, params: T.MlUpdateModelSnapshotRequest | TB.MlUpdateModelSnapshotRequest, options?: TransportRequestOptions): Promise<T.MlUpdateModelSnapshotResponse>;
    /**
      * Starts a trained model deployment, which allocates the model to every machine learning node.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-trained-model-deployment.html | Elasticsearch API documentation}
      */
    updateTrainedModelDeployment(this: That, params: T.MlUpdateTrainedModelDeploymentRequest | TB.MlUpdateTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpdateTrainedModelDeploymentResponse>;
    updateTrainedModelDeployment(this: That, params: T.MlUpdateTrainedModelDeploymentRequest | TB.MlUpdateTrainedModelDeploymentRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpdateTrainedModelDeploymentResponse, unknown>>;
    updateTrainedModelDeployment(this: That, params: T.MlUpdateTrainedModelDeploymentRequest | TB.MlUpdateTrainedModelDeploymentRequest, options?: TransportRequestOptions): Promise<T.MlUpdateTrainedModelDeploymentResponse>;
    /**
      * Upgrades an anomaly detection model snapshot to the latest major version. Over time, older snapshot formats are deprecated and removed. Anomaly detection jobs support only snapshots that are from the current or previous major version. This API provides a means to upgrade a snapshot to the current major version. This aids in preparing the cluster for an upgrade to the next major version. Only one snapshot per anomaly detection job can be upgraded at a time and the upgraded snapshot cannot be the current snapshot of the anomaly detection job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ml-upgrade-job-model-snapshot.html | Elasticsearch API documentation}
      */
    upgradeJobSnapshot(this: That, params: T.MlUpgradeJobSnapshotRequest | TB.MlUpgradeJobSnapshotRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlUpgradeJobSnapshotResponse>;
    upgradeJobSnapshot(this: That, params: T.MlUpgradeJobSnapshotRequest | TB.MlUpgradeJobSnapshotRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlUpgradeJobSnapshotResponse, unknown>>;
    upgradeJobSnapshot(this: That, params: T.MlUpgradeJobSnapshotRequest | TB.MlUpgradeJobSnapshotRequest, options?: TransportRequestOptions): Promise<T.MlUpgradeJobSnapshotResponse>;
    /**
      * Validates an anomaly detection job.
      * @see {@link https://www.elastic.co/guide/en/machine-learning/8.15/ml-jobs.html | Elasticsearch API documentation}
      */
    validate(this: That, params?: T.MlValidateRequest | TB.MlValidateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlValidateResponse>;
    validate(this: That, params?: T.MlValidateRequest | TB.MlValidateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlValidateResponse, unknown>>;
    validate(this: That, params?: T.MlValidateRequest | TB.MlValidateRequest, options?: TransportRequestOptions): Promise<T.MlValidateResponse>;
    /**
      * Validates an anomaly detection detector.
      * @see {@link https://www.elastic.co/guide/en/machine-learning/8.15/ml-jobs.html | Elasticsearch API documentation}
      */
    validateDetector(this: That, params: T.MlValidateDetectorRequest | TB.MlValidateDetectorRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.MlValidateDetectorResponse>;
    validateDetector(this: That, params: T.MlValidateDetectorRequest | TB.MlValidateDetectorRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.MlValidateDetectorResponse, unknown>>;
    validateDetector(this: That, params: T.MlValidateDetectorRequest | TB.MlValidateDetectorRequest, options?: TransportRequestOptions): Promise<T.MlValidateDetectorResponse>;
}
export {};
