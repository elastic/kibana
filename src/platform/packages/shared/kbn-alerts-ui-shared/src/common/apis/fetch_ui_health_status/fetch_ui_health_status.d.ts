import type { HttpStart } from '@kbn/core-http-browser';
import type { UiHealthCheck } from './types';
export declare const fetchUiHealthStatus: ({ http, }: {
    http: HttpStart;
}) => Promise<UiHealthCheck>;
