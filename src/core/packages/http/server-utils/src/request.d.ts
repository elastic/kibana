import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { KibanaRequest, RawRequest, RouteValidator, RouteValidatorFullConfigRequest } from '@kbn/core-http-server';
/**
 * Allows building a KibanaRequest from a RawRequest, leveraging internal CoreKibanaRequest.
 * @param req The raw request to build from
 * @param routeSchemas The route schemas
 * @param withoutSecretHeaders Whether we want to exclude secret headers
 * @returns A KibanaRequest object
 */
export declare function kibanaRequestFactory<P, Q, B>(req: RawRequest, routeSchemas?: RouteValidator<P, Q, B> | RouteValidatorFullConfigRequest<P, Q, B>, withoutSecretHeaders?: boolean): KibanaRequest<P, Q, B>;
export declare function isCoreKibanaRequest<P, Q, B>(req: KibanaRequest<P, Q, B>): req is CoreKibanaRequest<any, any, any, any>;
