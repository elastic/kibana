import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Ilm {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes the specified lifecycle policy definition. You cannot delete policies that are currently in use. If the policy is being used to manage any indices, the request fails and returns an error.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-delete-lifecycle.html | Elasticsearch API documentation}
      */
    deleteLifecycle(this: That, params: T.IlmDeleteLifecycleRequest | TB.IlmDeleteLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmDeleteLifecycleResponse>;
    deleteLifecycle(this: That, params: T.IlmDeleteLifecycleRequest | TB.IlmDeleteLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmDeleteLifecycleResponse, unknown>>;
    deleteLifecycle(this: That, params: T.IlmDeleteLifecycleRequest | TB.IlmDeleteLifecycleRequest, options?: TransportRequestOptions): Promise<T.IlmDeleteLifecycleResponse>;
    /**
      * Retrieves information about the index’s current lifecycle state, such as the currently executing phase, action, and step. Shows when the index entered each one, the definition of the running phase, and information about any failures.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-explain-lifecycle.html | Elasticsearch API documentation}
      */
    explainLifecycle(this: That, params: T.IlmExplainLifecycleRequest | TB.IlmExplainLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmExplainLifecycleResponse>;
    explainLifecycle(this: That, params: T.IlmExplainLifecycleRequest | TB.IlmExplainLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmExplainLifecycleResponse, unknown>>;
    explainLifecycle(this: That, params: T.IlmExplainLifecycleRequest | TB.IlmExplainLifecycleRequest, options?: TransportRequestOptions): Promise<T.IlmExplainLifecycleResponse>;
    /**
      * Retrieves a lifecycle policy.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-get-lifecycle.html | Elasticsearch API documentation}
      */
    getLifecycle(this: That, params?: T.IlmGetLifecycleRequest | TB.IlmGetLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmGetLifecycleResponse>;
    getLifecycle(this: That, params?: T.IlmGetLifecycleRequest | TB.IlmGetLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmGetLifecycleResponse, unknown>>;
    getLifecycle(this: That, params?: T.IlmGetLifecycleRequest | TB.IlmGetLifecycleRequest, options?: TransportRequestOptions): Promise<T.IlmGetLifecycleResponse>;
    /**
      * Retrieves the current index lifecycle management (ILM) status.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-get-status.html | Elasticsearch API documentation}
      */
    getStatus(this: That, params?: T.IlmGetStatusRequest | TB.IlmGetStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmGetStatusResponse>;
    getStatus(this: That, params?: T.IlmGetStatusRequest | TB.IlmGetStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmGetStatusResponse, unknown>>;
    getStatus(this: That, params?: T.IlmGetStatusRequest | TB.IlmGetStatusRequest, options?: TransportRequestOptions): Promise<T.IlmGetStatusResponse>;
    /**
      * Switches the indices, ILM policies, and legacy, composable and component templates from using custom node attributes and attribute-based allocation filters to using data tiers, and optionally deletes one legacy index template.+ Using node roles enables ILM to automatically move the indices between data tiers.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-migrate-to-data-tiers.html | Elasticsearch API documentation}
      */
    migrateToDataTiers(this: That, params?: T.IlmMigrateToDataTiersRequest | TB.IlmMigrateToDataTiersRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmMigrateToDataTiersResponse>;
    migrateToDataTiers(this: That, params?: T.IlmMigrateToDataTiersRequest | TB.IlmMigrateToDataTiersRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmMigrateToDataTiersResponse, unknown>>;
    migrateToDataTiers(this: That, params?: T.IlmMigrateToDataTiersRequest | TB.IlmMigrateToDataTiersRequest, options?: TransportRequestOptions): Promise<T.IlmMigrateToDataTiersResponse>;
    /**
      * Manually moves an index into the specified step and executes that step.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-move-to-step.html | Elasticsearch API documentation}
      */
    moveToStep(this: That, params: T.IlmMoveToStepRequest | TB.IlmMoveToStepRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmMoveToStepResponse>;
    moveToStep(this: That, params: T.IlmMoveToStepRequest | TB.IlmMoveToStepRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmMoveToStepResponse, unknown>>;
    moveToStep(this: That, params: T.IlmMoveToStepRequest | TB.IlmMoveToStepRequest, options?: TransportRequestOptions): Promise<T.IlmMoveToStepResponse>;
    /**
      * Creates a lifecycle policy. If the specified policy exists, the policy is replaced and the policy version is incremented.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-put-lifecycle.html | Elasticsearch API documentation}
      */
    putLifecycle(this: That, params: T.IlmPutLifecycleRequest | TB.IlmPutLifecycleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmPutLifecycleResponse>;
    putLifecycle(this: That, params: T.IlmPutLifecycleRequest | TB.IlmPutLifecycleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmPutLifecycleResponse, unknown>>;
    putLifecycle(this: That, params: T.IlmPutLifecycleRequest | TB.IlmPutLifecycleRequest, options?: TransportRequestOptions): Promise<T.IlmPutLifecycleResponse>;
    /**
      * Removes the assigned lifecycle policy and stops managing the specified index
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-remove-policy.html | Elasticsearch API documentation}
      */
    removePolicy(this: That, params: T.IlmRemovePolicyRequest | TB.IlmRemovePolicyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmRemovePolicyResponse>;
    removePolicy(this: That, params: T.IlmRemovePolicyRequest | TB.IlmRemovePolicyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmRemovePolicyResponse, unknown>>;
    removePolicy(this: That, params: T.IlmRemovePolicyRequest | TB.IlmRemovePolicyRequest, options?: TransportRequestOptions): Promise<T.IlmRemovePolicyResponse>;
    /**
      * Retries executing the policy for an index that is in the ERROR step.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-retry-policy.html | Elasticsearch API documentation}
      */
    retry(this: That, params: T.IlmRetryRequest | TB.IlmRetryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmRetryResponse>;
    retry(this: That, params: T.IlmRetryRequest | TB.IlmRetryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmRetryResponse, unknown>>;
    retry(this: That, params: T.IlmRetryRequest | TB.IlmRetryRequest, options?: TransportRequestOptions): Promise<T.IlmRetryResponse>;
    /**
      * Start the index lifecycle management (ILM) plugin.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-start.html | Elasticsearch API documentation}
      */
    start(this: That, params?: T.IlmStartRequest | TB.IlmStartRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmStartResponse>;
    start(this: That, params?: T.IlmStartRequest | TB.IlmStartRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmStartResponse, unknown>>;
    start(this: That, params?: T.IlmStartRequest | TB.IlmStartRequest, options?: TransportRequestOptions): Promise<T.IlmStartResponse>;
    /**
      * Halts all lifecycle management operations and stops the index lifecycle management (ILM) plugin
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/ilm-stop.html | Elasticsearch API documentation}
      */
    stop(this: That, params?: T.IlmStopRequest | TB.IlmStopRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.IlmStopResponse>;
    stop(this: That, params?: T.IlmStopRequest | TB.IlmStopRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.IlmStopResponse, unknown>>;
    stop(this: That, params?: T.IlmStopRequest | TB.IlmStopRequest, options?: TransportRequestOptions): Promise<T.IlmStopResponse>;
}
export {};
