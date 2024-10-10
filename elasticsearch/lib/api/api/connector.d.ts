import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Connector {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Updates the last_seen field in the connector, and sets it to current timestamp
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/check-in-connector-api.html | Elasticsearch API documentation}
      */
    checkIn(this: That, params: T.ConnectorCheckInRequest | TB.ConnectorCheckInRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorCheckInResponse>;
    checkIn(this: That, params: T.ConnectorCheckInRequest | TB.ConnectorCheckInRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorCheckInResponse, unknown>>;
    checkIn(this: That, params: T.ConnectorCheckInRequest | TB.ConnectorCheckInRequest, options?: TransportRequestOptions): Promise<T.ConnectorCheckInResponse>;
    /**
      * Deletes a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-connector-api.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.ConnectorDeleteRequest | TB.ConnectorDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorDeleteResponse>;
    delete(this: That, params: T.ConnectorDeleteRequest | TB.ConnectorDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorDeleteResponse, unknown>>;
    delete(this: That, params: T.ConnectorDeleteRequest | TB.ConnectorDeleteRequest, options?: TransportRequestOptions): Promise<T.ConnectorDeleteResponse>;
    /**
      * Retrieves a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-connector-api.html | Elasticsearch API documentation}
      */
    get(this: That, params: T.ConnectorGetRequest | TB.ConnectorGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorGetResponse>;
    get(this: That, params: T.ConnectorGetRequest | TB.ConnectorGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorGetResponse, unknown>>;
    get(this: That, params: T.ConnectorGetRequest | TB.ConnectorGetRequest, options?: TransportRequestOptions): Promise<T.ConnectorGetResponse>;
    /**
      * Updates last sync stats in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-last-sync-api.html | Elasticsearch API documentation}
      */
    lastSync(this: That, params: T.ConnectorLastSyncRequest | TB.ConnectorLastSyncRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorLastSyncResponse>;
    lastSync(this: That, params: T.ConnectorLastSyncRequest | TB.ConnectorLastSyncRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorLastSyncResponse, unknown>>;
    lastSync(this: That, params: T.ConnectorLastSyncRequest | TB.ConnectorLastSyncRequest, options?: TransportRequestOptions): Promise<T.ConnectorLastSyncResponse>;
    /**
      * Returns existing connectors.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-connector-api.html | Elasticsearch API documentation}
      */
    list(this: That, params?: T.ConnectorListRequest | TB.ConnectorListRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorListResponse>;
    list(this: That, params?: T.ConnectorListRequest | TB.ConnectorListRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorListResponse, unknown>>;
    list(this: That, params?: T.ConnectorListRequest | TB.ConnectorListRequest, options?: TransportRequestOptions): Promise<T.ConnectorListResponse>;
    /**
      * Creates a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/create-connector-api.html | Elasticsearch API documentation}
      */
    post(this: That, params?: T.ConnectorPostRequest | TB.ConnectorPostRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorPostResponse>;
    post(this: That, params?: T.ConnectorPostRequest | TB.ConnectorPostRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorPostResponse, unknown>>;
    post(this: That, params?: T.ConnectorPostRequest | TB.ConnectorPostRequest, options?: TransportRequestOptions): Promise<T.ConnectorPostResponse>;
    /**
      * Creates or updates a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/create-connector-api.html | Elasticsearch API documentation}
      */
    put(this: That, params?: T.ConnectorPutRequest | TB.ConnectorPutRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorPutResponse>;
    put(this: That, params?: T.ConnectorPutRequest | TB.ConnectorPutRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorPutResponse, unknown>>;
    put(this: That, params?: T.ConnectorPutRequest | TB.ConnectorPutRequest, options?: TransportRequestOptions): Promise<T.ConnectorPutResponse>;
    /**
      * Deletes a connector secret.
      */
    secretDelete(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    secretDelete(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    secretDelete(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves a secret stored by Connectors.
      */
    secretGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    secretGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    secretGet(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates a secret for a Connector.
      */
    secretPost(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    secretPost(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    secretPost(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates or updates a secret for a Connector.
      */
    secretPut(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    secretPut(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    secretPut(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Cancels a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/cancel-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobCancel(this: That, params: T.ConnectorSyncJobCancelRequest | TB.ConnectorSyncJobCancelRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorSyncJobCancelResponse>;
    syncJobCancel(this: That, params: T.ConnectorSyncJobCancelRequest | TB.ConnectorSyncJobCancelRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorSyncJobCancelResponse, unknown>>;
    syncJobCancel(this: That, params: T.ConnectorSyncJobCancelRequest | TB.ConnectorSyncJobCancelRequest, options?: TransportRequestOptions): Promise<T.ConnectorSyncJobCancelResponse>;
    /**
      * Checks in a connector sync job (refreshes 'last_seen').
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/check-in-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobCheckIn(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    syncJobCheckIn(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    syncJobCheckIn(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Claims a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/claim-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobClaim(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    syncJobClaim(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    syncJobClaim(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Deletes a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobDelete(this: That, params: T.ConnectorSyncJobDeleteRequest | TB.ConnectorSyncJobDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorSyncJobDeleteResponse>;
    syncJobDelete(this: That, params: T.ConnectorSyncJobDeleteRequest | TB.ConnectorSyncJobDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorSyncJobDeleteResponse, unknown>>;
    syncJobDelete(this: That, params: T.ConnectorSyncJobDeleteRequest | TB.ConnectorSyncJobDeleteRequest, options?: TransportRequestOptions): Promise<T.ConnectorSyncJobDeleteResponse>;
    /**
      * Sets an error for a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/set-connector-sync-job-error-api.html | Elasticsearch API documentation}
      */
    syncJobError(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    syncJobError(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    syncJobError(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobGet(this: That, params: T.ConnectorSyncJobGetRequest | TB.ConnectorSyncJobGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorSyncJobGetResponse>;
    syncJobGet(this: That, params: T.ConnectorSyncJobGetRequest | TB.ConnectorSyncJobGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorSyncJobGetResponse, unknown>>;
    syncJobGet(this: That, params: T.ConnectorSyncJobGetRequest | TB.ConnectorSyncJobGetRequest, options?: TransportRequestOptions): Promise<T.ConnectorSyncJobGetResponse>;
    /**
      * Lists connector sync jobs.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/list-connector-sync-jobs-api.html | Elasticsearch API documentation}
      */
    syncJobList(this: That, params?: T.ConnectorSyncJobListRequest | TB.ConnectorSyncJobListRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorSyncJobListResponse>;
    syncJobList(this: That, params?: T.ConnectorSyncJobListRequest | TB.ConnectorSyncJobListRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorSyncJobListResponse, unknown>>;
    syncJobList(this: That, params?: T.ConnectorSyncJobListRequest | TB.ConnectorSyncJobListRequest, options?: TransportRequestOptions): Promise<T.ConnectorSyncJobListResponse>;
    /**
      * Creates a connector sync job.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/create-connector-sync-job-api.html | Elasticsearch API documentation}
      */
    syncJobPost(this: That, params: T.ConnectorSyncJobPostRequest | TB.ConnectorSyncJobPostRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorSyncJobPostResponse>;
    syncJobPost(this: That, params: T.ConnectorSyncJobPostRequest | TB.ConnectorSyncJobPostRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorSyncJobPostResponse, unknown>>;
    syncJobPost(this: That, params: T.ConnectorSyncJobPostRequest | TB.ConnectorSyncJobPostRequest, options?: TransportRequestOptions): Promise<T.ConnectorSyncJobPostResponse>;
    /**
      * Updates the stats fields in the connector sync job document.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/set-connector-sync-job-stats-api.html | Elasticsearch API documentation}
      */
    syncJobUpdateStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    syncJobUpdateStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    syncJobUpdateStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Activates the valid draft filtering for a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-filtering-api.html | Elasticsearch API documentation}
      */
    updateActiveFiltering(this: That, params: T.ConnectorUpdateActiveFilteringRequest | TB.ConnectorUpdateActiveFilteringRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateActiveFilteringResponse>;
    updateActiveFiltering(this: That, params: T.ConnectorUpdateActiveFilteringRequest | TB.ConnectorUpdateActiveFilteringRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateActiveFilteringResponse, unknown>>;
    updateActiveFiltering(this: That, params: T.ConnectorUpdateActiveFilteringRequest | TB.ConnectorUpdateActiveFilteringRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateActiveFilteringResponse>;
    /**
      * Updates the API key id in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-api-key-id-api.html | Elasticsearch API documentation}
      */
    updateApiKeyId(this: That, params: T.ConnectorUpdateApiKeyIdRequest | TB.ConnectorUpdateApiKeyIdRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateApiKeyIdResponse>;
    updateApiKeyId(this: That, params: T.ConnectorUpdateApiKeyIdRequest | TB.ConnectorUpdateApiKeyIdRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateApiKeyIdResponse, unknown>>;
    updateApiKeyId(this: That, params: T.ConnectorUpdateApiKeyIdRequest | TB.ConnectorUpdateApiKeyIdRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateApiKeyIdResponse>;
    /**
      * Updates the configuration field in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-configuration-api.html | Elasticsearch API documentation}
      */
    updateConfiguration(this: That, params: T.ConnectorUpdateConfigurationRequest | TB.ConnectorUpdateConfigurationRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateConfigurationResponse>;
    updateConfiguration(this: That, params: T.ConnectorUpdateConfigurationRequest | TB.ConnectorUpdateConfigurationRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateConfigurationResponse, unknown>>;
    updateConfiguration(this: That, params: T.ConnectorUpdateConfigurationRequest | TB.ConnectorUpdateConfigurationRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateConfigurationResponse>;
    /**
      * Updates the filtering field in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-error-api.html | Elasticsearch API documentation}
      */
    updateError(this: That, params: T.ConnectorUpdateErrorRequest | TB.ConnectorUpdateErrorRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateErrorResponse>;
    updateError(this: That, params: T.ConnectorUpdateErrorRequest | TB.ConnectorUpdateErrorRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateErrorResponse, unknown>>;
    updateError(this: That, params: T.ConnectorUpdateErrorRequest | TB.ConnectorUpdateErrorRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateErrorResponse>;
    /**
      * Updates the connector features in the connector document.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-features-api.html | Elasticsearch API documentation}
      */
    updateFeatures(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    updateFeatures(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    updateFeatures(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Updates the filtering field in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-filtering-api.html | Elasticsearch API documentation}
      */
    updateFiltering(this: That, params: T.ConnectorUpdateFilteringRequest | TB.ConnectorUpdateFilteringRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateFilteringResponse>;
    updateFiltering(this: That, params: T.ConnectorUpdateFilteringRequest | TB.ConnectorUpdateFilteringRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateFilteringResponse, unknown>>;
    updateFiltering(this: That, params: T.ConnectorUpdateFilteringRequest | TB.ConnectorUpdateFilteringRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateFilteringResponse>;
    /**
      * Updates the draft filtering validation info for a connector.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-filtering-validation-api.html | Elasticsearch API documentation}
      */
    updateFilteringValidation(this: That, params: T.ConnectorUpdateFilteringValidationRequest | TB.ConnectorUpdateFilteringValidationRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateFilteringValidationResponse>;
    updateFilteringValidation(this: That, params: T.ConnectorUpdateFilteringValidationRequest | TB.ConnectorUpdateFilteringValidationRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateFilteringValidationResponse, unknown>>;
    updateFilteringValidation(this: That, params: T.ConnectorUpdateFilteringValidationRequest | TB.ConnectorUpdateFilteringValidationRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateFilteringValidationResponse>;
    /**
      * Updates the index_name in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-index-name-api.html | Elasticsearch API documentation}
      */
    updateIndexName(this: That, params: T.ConnectorUpdateIndexNameRequest | TB.ConnectorUpdateIndexNameRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateIndexNameResponse>;
    updateIndexName(this: That, params: T.ConnectorUpdateIndexNameRequest | TB.ConnectorUpdateIndexNameRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateIndexNameResponse, unknown>>;
    updateIndexName(this: That, params: T.ConnectorUpdateIndexNameRequest | TB.ConnectorUpdateIndexNameRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateIndexNameResponse>;
    /**
      * Updates the name and description fields in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-name-description-api.html | Elasticsearch API documentation}
      */
    updateName(this: That, params: T.ConnectorUpdateNameRequest | TB.ConnectorUpdateNameRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateNameResponse>;
    updateName(this: That, params: T.ConnectorUpdateNameRequest | TB.ConnectorUpdateNameRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateNameResponse, unknown>>;
    updateName(this: That, params: T.ConnectorUpdateNameRequest | TB.ConnectorUpdateNameRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateNameResponse>;
    /**
      * Updates the is_native flag in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-native-api.html | Elasticsearch API documentation}
      */
    updateNative(this: That, params: T.ConnectorUpdateNativeRequest | TB.ConnectorUpdateNativeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateNativeResponse>;
    updateNative(this: That, params: T.ConnectorUpdateNativeRequest | TB.ConnectorUpdateNativeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateNativeResponse, unknown>>;
    updateNative(this: That, params: T.ConnectorUpdateNativeRequest | TB.ConnectorUpdateNativeRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateNativeResponse>;
    /**
      * Updates the pipeline field in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-pipeline-api.html | Elasticsearch API documentation}
      */
    updatePipeline(this: That, params: T.ConnectorUpdatePipelineRequest | TB.ConnectorUpdatePipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdatePipelineResponse>;
    updatePipeline(this: That, params: T.ConnectorUpdatePipelineRequest | TB.ConnectorUpdatePipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdatePipelineResponse, unknown>>;
    updatePipeline(this: That, params: T.ConnectorUpdatePipelineRequest | TB.ConnectorUpdatePipelineRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdatePipelineResponse>;
    /**
      * Updates the scheduling field in the connector document
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-scheduling-api.html | Elasticsearch API documentation}
      */
    updateScheduling(this: That, params: T.ConnectorUpdateSchedulingRequest | TB.ConnectorUpdateSchedulingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateSchedulingResponse>;
    updateScheduling(this: That, params: T.ConnectorUpdateSchedulingRequest | TB.ConnectorUpdateSchedulingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateSchedulingResponse, unknown>>;
    updateScheduling(this: That, params: T.ConnectorUpdateSchedulingRequest | TB.ConnectorUpdateSchedulingRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateSchedulingResponse>;
    /**
      * Updates the service type of the connector
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-service-type-api.html | Elasticsearch API documentation}
      */
    updateServiceType(this: That, params: T.ConnectorUpdateServiceTypeRequest | TB.ConnectorUpdateServiceTypeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateServiceTypeResponse>;
    updateServiceType(this: That, params: T.ConnectorUpdateServiceTypeRequest | TB.ConnectorUpdateServiceTypeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateServiceTypeResponse, unknown>>;
    updateServiceType(this: That, params: T.ConnectorUpdateServiceTypeRequest | TB.ConnectorUpdateServiceTypeRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateServiceTypeResponse>;
    /**
      * Updates the status of the connector
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-connector-status-api.html | Elasticsearch API documentation}
      */
    updateStatus(this: That, params: T.ConnectorUpdateStatusRequest | TB.ConnectorUpdateStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.ConnectorUpdateStatusResponse>;
    updateStatus(this: That, params: T.ConnectorUpdateStatusRequest | TB.ConnectorUpdateStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.ConnectorUpdateStatusResponse, unknown>>;
    updateStatus(this: That, params: T.ConnectorUpdateStatusRequest | TB.ConnectorUpdateStatusRequest, options?: TransportRequestOptions): Promise<T.ConnectorUpdateStatusResponse>;
}
export {};
