import type { Headers } from '@kbn/core-http-server';
export declare function filterHeaders(headers: Headers, fieldsToKeep: string[], fieldsToExclude?: string[]): Headers;
