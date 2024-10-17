import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Profiling {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Extracts a UI-optimized structure to render flamegraphs from Universal Profiling.
      * @see {@link https://www.elastic.co/guide/en/observability/8.15/universal-profiling.html | Elasticsearch API documentation}
      */
    flamegraph(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    flamegraph(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    flamegraph(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Extracts raw stacktrace information from Universal Profiling.
      * @see {@link https://www.elastic.co/guide/en/observability/8.15/universal-profiling.html | Elasticsearch API documentation}
      */
    stacktraces(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    stacktraces(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    stacktraces(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Returns basic information about the status of Universal Profiling.
      * @see {@link https://www.elastic.co/guide/en/observability/8.15/universal-profiling.html | Elasticsearch API documentation}
      */
    status(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    status(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    status(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Extracts a list of topN functions from Universal Profiling.
      * @see {@link https://www.elastic.co/guide/en/observability/8.15/universal-profiling.html | Elasticsearch API documentation}
      */
    topnFunctions(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    topnFunctions(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    topnFunctions(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
}
export {};
