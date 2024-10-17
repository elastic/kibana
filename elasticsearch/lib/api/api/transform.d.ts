import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Transform {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a transform.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-transform.html | Elasticsearch API documentation}
      */
    deleteTransform(this: That, params: T.TransformDeleteTransformRequest | TB.TransformDeleteTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformDeleteTransformResponse>;
    deleteTransform(this: That, params: T.TransformDeleteTransformRequest | TB.TransformDeleteTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformDeleteTransformResponse, unknown>>;
    deleteTransform(this: That, params: T.TransformDeleteTransformRequest | TB.TransformDeleteTransformRequest, options?: TransportRequestOptions): Promise<T.TransformDeleteTransformResponse>;
    /**
      * Retrieves transform usage information for transform nodes.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-transform-node-stats.html | Elasticsearch API documentation}
      */
    getNodeStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    getNodeStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    getNodeStats(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Retrieves configuration information for transforms.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-transform.html | Elasticsearch API documentation}
      */
    getTransform(this: That, params?: T.TransformGetTransformRequest | TB.TransformGetTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformGetTransformResponse>;
    getTransform(this: That, params?: T.TransformGetTransformRequest | TB.TransformGetTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformGetTransformResponse, unknown>>;
    getTransform(this: That, params?: T.TransformGetTransformRequest | TB.TransformGetTransformRequest, options?: TransportRequestOptions): Promise<T.TransformGetTransformResponse>;
    /**
      * Retrieves usage information for transforms.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-transform-stats.html | Elasticsearch API documentation}
      */
    getTransformStats(this: That, params: T.TransformGetTransformStatsRequest | TB.TransformGetTransformStatsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformGetTransformStatsResponse>;
    getTransformStats(this: That, params: T.TransformGetTransformStatsRequest | TB.TransformGetTransformStatsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformGetTransformStatsResponse, unknown>>;
    getTransformStats(this: That, params: T.TransformGetTransformStatsRequest | TB.TransformGetTransformStatsRequest, options?: TransportRequestOptions): Promise<T.TransformGetTransformStatsResponse>;
    /**
      * Previews a transform. It returns a maximum of 100 results. The calculations are based on all the current data in the source index. It also generates a list of mappings and settings for the destination index. These values are determined based on the field types of the source index and the transform aggregations.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/preview-transform.html | Elasticsearch API documentation}
      */
    previewTransform<TTransform = unknown>(this: That, params?: T.TransformPreviewTransformRequest | TB.TransformPreviewTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformPreviewTransformResponse<TTransform>>;
    previewTransform<TTransform = unknown>(this: That, params?: T.TransformPreviewTransformRequest | TB.TransformPreviewTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformPreviewTransformResponse<TTransform>, unknown>>;
    previewTransform<TTransform = unknown>(this: That, params?: T.TransformPreviewTransformRequest | TB.TransformPreviewTransformRequest, options?: TransportRequestOptions): Promise<T.TransformPreviewTransformResponse<TTransform>>;
    /**
      * Creates a transform. A transform copies data from source indices, transforms it, and persists it into an entity-centric destination index. You can also think of the destination index as a two-dimensional tabular data structure (known as a data frame). The ID for each document in the data frame is generated from a hash of the entity, so there is a unique row per entity. You must choose either the latest or pivot method for your transform; you cannot use both in a single transform. If you choose to use the pivot method for your transform, the entities are defined by the set of `group_by` fields in the pivot object. If you choose to use the latest method, the entities are defined by the `unique_key` field values in the latest object. You must have `create_index`, `index`, and `read` privileges on the destination index and `read` and `view_index_metadata` privileges on the source indices. When Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the time of creation and uses those same roles. If those roles do not have the required privileges on the source and destination indices, the transform fails when it attempts unauthorized operations. NOTE: You must use Kibana or this API to create a transform. Do not add a transform directly into any `.transform-internal*` indices using the Elasticsearch index API. If Elasticsearch security features are enabled, do not give users any privileges on `.transform-internal*` indices. If you used transforms prior to 7.5, also do not give users any privileges on `.data-frame-internal*` indices.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-transform.html | Elasticsearch API documentation}
      */
    putTransform(this: That, params: T.TransformPutTransformRequest | TB.TransformPutTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformPutTransformResponse>;
    putTransform(this: That, params: T.TransformPutTransformRequest | TB.TransformPutTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformPutTransformResponse, unknown>>;
    putTransform(this: That, params: T.TransformPutTransformRequest | TB.TransformPutTransformRequest, options?: TransportRequestOptions): Promise<T.TransformPutTransformResponse>;
    /**
      * Resets a transform. Before you can reset it, you must stop it; alternatively, use the `force` query parameter. If the destination index was created by the transform, it is deleted.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/reset-transform.html | Elasticsearch API documentation}
      */
    resetTransform(this: That, params: T.TransformResetTransformRequest | TB.TransformResetTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformResetTransformResponse>;
    resetTransform(this: That, params: T.TransformResetTransformRequest | TB.TransformResetTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformResetTransformResponse, unknown>>;
    resetTransform(this: That, params: T.TransformResetTransformRequest | TB.TransformResetTransformRequest, options?: TransportRequestOptions): Promise<T.TransformResetTransformResponse>;
    /**
      * Schedules now a transform. If you _schedule_now a transform, it will process the new data instantly, without waiting for the configured frequency interval. After _schedule_now API is called, the transform will be processed again at now + frequency unless _schedule_now API is called again in the meantime.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/schedule-now-transform.html | Elasticsearch API documentation}
      */
    scheduleNowTransform(this: That, params: T.TransformScheduleNowTransformRequest | TB.TransformScheduleNowTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformScheduleNowTransformResponse>;
    scheduleNowTransform(this: That, params: T.TransformScheduleNowTransformRequest | TB.TransformScheduleNowTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformScheduleNowTransformResponse, unknown>>;
    scheduleNowTransform(this: That, params: T.TransformScheduleNowTransformRequest | TB.TransformScheduleNowTransformRequest, options?: TransportRequestOptions): Promise<T.TransformScheduleNowTransformResponse>;
    /**
      * Starts a transform. When you start a transform, it creates the destination index if it does not already exist. The `number_of_shards` is set to `1` and the `auto_expand_replicas` is set to `0-1`. If it is a pivot transform, it deduces the mapping definitions for the destination index from the source indices and the transform aggregations. If fields in the destination index are derived from scripts (as in the case of `scripted_metric` or `bucket_script` aggregations), the transform uses dynamic mappings unless an index template exists. If it is a latest transform, it does not deduce mapping definitions; it uses dynamic mappings. To use explicit mappings, create the destination index before you start the transform. Alternatively, you can create an index template, though it does not affect the deduced mappings in a pivot transform. When the transform starts, a series of validations occur to ensure its success. If you deferred validation when you created the transform, they occur when you start the transform—with the exception of privilege checks. When Elasticsearch security features are enabled, the transform remembers which roles the user that created it had at the time of creation and uses those same roles. If those roles do not have the required privileges on the source and destination indices, the transform fails when it attempts unauthorized operations.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/start-transform.html | Elasticsearch API documentation}
      */
    startTransform(this: That, params: T.TransformStartTransformRequest | TB.TransformStartTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformStartTransformResponse>;
    startTransform(this: That, params: T.TransformStartTransformRequest | TB.TransformStartTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformStartTransformResponse, unknown>>;
    startTransform(this: That, params: T.TransformStartTransformRequest | TB.TransformStartTransformRequest, options?: TransportRequestOptions): Promise<T.TransformStartTransformResponse>;
    /**
      * Stops one or more transforms.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/stop-transform.html | Elasticsearch API documentation}
      */
    stopTransform(this: That, params: T.TransformStopTransformRequest | TB.TransformStopTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformStopTransformResponse>;
    stopTransform(this: That, params: T.TransformStopTransformRequest | TB.TransformStopTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformStopTransformResponse, unknown>>;
    stopTransform(this: That, params: T.TransformStopTransformRequest | TB.TransformStopTransformRequest, options?: TransportRequestOptions): Promise<T.TransformStopTransformResponse>;
    /**
      * Updates certain properties of a transform. All updated properties except `description` do not take effect until after the transform starts the next checkpoint, thus there is data consistency in each checkpoint. To use this API, you must have `read` and `view_index_metadata` privileges for the source indices. You must also have `index` and `read` privileges for the destination index. When Elasticsearch security features are enabled, the transform remembers which roles the user who updated it had at the time of update and runs with those privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/update-transform.html | Elasticsearch API documentation}
      */
    updateTransform(this: That, params: T.TransformUpdateTransformRequest | TB.TransformUpdateTransformRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformUpdateTransformResponse>;
    updateTransform(this: That, params: T.TransformUpdateTransformRequest | TB.TransformUpdateTransformRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformUpdateTransformResponse, unknown>>;
    updateTransform(this: That, params: T.TransformUpdateTransformRequest | TB.TransformUpdateTransformRequest, options?: TransportRequestOptions): Promise<T.TransformUpdateTransformResponse>;
    /**
      * Upgrades all transforms. This API identifies transforms that have a legacy configuration format and upgrades them to the latest version. It also cleans up the internal data structures that store the transform state and checkpoints. The upgrade does not affect the source and destination indices. The upgrade also does not affect the roles that transforms use when Elasticsearch security features are enabled; the role used to read source data and write to the destination index remains unchanged.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/upgrade-transforms.html | Elasticsearch API documentation}
      */
    upgradeTransforms(this: That, params?: T.TransformUpgradeTransformsRequest | TB.TransformUpgradeTransformsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TransformUpgradeTransformsResponse>;
    upgradeTransforms(this: That, params?: T.TransformUpgradeTransformsRequest | TB.TransformUpgradeTransformsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TransformUpgradeTransformsResponse, unknown>>;
    upgradeTransforms(this: That, params?: T.TransformUpgradeTransformsRequest | TB.TransformUpgradeTransformsRequest, options?: TransportRequestOptions): Promise<T.TransformUpgradeTransformsResponse>;
}
export {};
