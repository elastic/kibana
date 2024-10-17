import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Tasks {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Cancels a task, if it can be cancelled through an API.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/tasks.html | Elasticsearch API documentation}
      */
    cancel(this: That, params?: T.TasksCancelRequest | TB.TasksCancelRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TasksCancelResponse>;
    cancel(this: That, params?: T.TasksCancelRequest | TB.TasksCancelRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TasksCancelResponse, unknown>>;
    cancel(this: That, params?: T.TasksCancelRequest | TB.TasksCancelRequest, options?: TransportRequestOptions): Promise<T.TasksCancelResponse>;
    /**
      * Returns information about a task.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/tasks.html | Elasticsearch API documentation}
      */
    get(this: That, params: T.TasksGetRequest | TB.TasksGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TasksGetResponse>;
    get(this: That, params: T.TasksGetRequest | TB.TasksGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TasksGetResponse, unknown>>;
    get(this: That, params: T.TasksGetRequest | TB.TasksGetRequest, options?: TransportRequestOptions): Promise<T.TasksGetResponse>;
    /**
      * The task management API returns information about tasks currently executing on one or more nodes in the cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/tasks.html | Elasticsearch API documentation}
      */
    list(this: That, params?: T.TasksListRequest | TB.TasksListRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.TasksListResponse>;
    list(this: That, params?: T.TasksListRequest | TB.TasksListRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TasksListResponse, unknown>>;
    list(this: That, params?: T.TasksListRequest | TB.TasksListRequest, options?: TransportRequestOptions): Promise<T.TasksListResponse>;
}
export {};
