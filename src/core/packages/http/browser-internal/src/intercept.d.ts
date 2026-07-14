import type { HttpInterceptor, HttpResponse, HttpFetchOptionsWithPath } from '@kbn/core-http-browser';
import type { HttpInterceptController } from './http_intercept_controller';
export declare function interceptFetch(fetch: (fetchOptions: HttpFetchOptionsWithPath) => Promise<HttpResponse>, options: HttpFetchOptionsWithPath, interceptors: ReadonlySet<HttpInterceptor>, controller: HttpInterceptController): Promise<HttpResponse>;
export declare function interceptRequest(options: HttpFetchOptionsWithPath, interceptors: ReadonlySet<HttpInterceptor>, controller: HttpInterceptController): Promise<HttpFetchOptionsWithPath>;
export declare function interceptResponse(fetchOptions: HttpFetchOptionsWithPath, responsePromise: Promise<HttpResponse>, interceptors: ReadonlySet<HttpInterceptor>, controller: HttpInterceptController): Promise<HttpResponse>;
