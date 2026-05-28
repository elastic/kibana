import type { ResponseError, CustomHttpResponseOptions } from '@kbn/core/server';
export declare function wrapError(error: any): CustomHttpResponseOptions<ResponseError>;
