import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Inference {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Delete an inference endpoint
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/delete-inference-api.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.InferenceDeleteRequest | TB.InferenceDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.InferenceDeleteResponse>;
    delete(this: That, params: T.InferenceDeleteRequest | TB.InferenceDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.InferenceDeleteResponse, unknown>>;
    delete(this: That, params: T.InferenceDeleteRequest | TB.InferenceDeleteRequest, options?: TransportRequestOptions): Promise<T.InferenceDeleteResponse>;
    /**
      * Get an inference endpoint
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/get-inference-api.html | Elasticsearch API documentation}
      */
    get(this: That, params?: T.InferenceGetRequest | TB.InferenceGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.InferenceGetResponse>;
    get(this: That, params?: T.InferenceGetRequest | TB.InferenceGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.InferenceGetResponse, unknown>>;
    get(this: That, params?: T.InferenceGetRequest | TB.InferenceGetRequest, options?: TransportRequestOptions): Promise<T.InferenceGetResponse>;
    /**
      * Perform inference on the service
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/post-inference-api.html | Elasticsearch API documentation}
      */
    inference(this: That, params: T.InferenceInferenceRequest | TB.InferenceInferenceRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.InferenceInferenceResponse>;
    inference(this: That, params: T.InferenceInferenceRequest | TB.InferenceInferenceRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.InferenceInferenceResponse, unknown>>;
    inference(this: That, params: T.InferenceInferenceRequest | TB.InferenceInferenceRequest, options?: TransportRequestOptions): Promise<T.InferenceInferenceResponse>;
    /**
      * Create an inference endpoint
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/put-inference-api.html | Elasticsearch API documentation}
      */
    put(this: That, params: T.InferencePutRequest | TB.InferencePutRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.InferencePutResponse>;
    put(this: That, params: T.InferencePutRequest | TB.InferencePutRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.InferencePutResponse, unknown>>;
    put(this: That, params: T.InferencePutRequest | TB.InferencePutRequest, options?: TransportRequestOptions): Promise<T.InferencePutResponse>;
}
export {};
