import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Logstash {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Deletes a pipeline used for Logstash Central Management.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/logstash-api-delete-pipeline.html | Elasticsearch API documentation}
      */
    deletePipeline(this: That, params: T.LogstashDeletePipelineRequest | TB.LogstashDeletePipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LogstashDeletePipelineResponse>;
    deletePipeline(this: That, params: T.LogstashDeletePipelineRequest | TB.LogstashDeletePipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LogstashDeletePipelineResponse, unknown>>;
    deletePipeline(this: That, params: T.LogstashDeletePipelineRequest | TB.LogstashDeletePipelineRequest, options?: TransportRequestOptions): Promise<T.LogstashDeletePipelineResponse>;
    /**
      * Retrieves pipelines used for Logstash Central Management.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/logstash-api-get-pipeline.html | Elasticsearch API documentation}
      */
    getPipeline(this: That, params?: T.LogstashGetPipelineRequest | TB.LogstashGetPipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LogstashGetPipelineResponse>;
    getPipeline(this: That, params?: T.LogstashGetPipelineRequest | TB.LogstashGetPipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LogstashGetPipelineResponse, unknown>>;
    getPipeline(this: That, params?: T.LogstashGetPipelineRequest | TB.LogstashGetPipelineRequest, options?: TransportRequestOptions): Promise<T.LogstashGetPipelineResponse>;
    /**
      * Creates or updates a pipeline used for Logstash Central Management.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/logstash-api-put-pipeline.html | Elasticsearch API documentation}
      */
    putPipeline(this: That, params: T.LogstashPutPipelineRequest | TB.LogstashPutPipelineRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.LogstashPutPipelineResponse>;
    putPipeline(this: That, params: T.LogstashPutPipelineRequest | TB.LogstashPutPipelineRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.LogstashPutPipelineResponse, unknown>>;
    putPipeline(this: That, params: T.LogstashPutPipelineRequest | TB.LogstashPutPipelineRequest, options?: TransportRequestOptions): Promise<T.LogstashPutPipelineResponse>;
}
export {};
