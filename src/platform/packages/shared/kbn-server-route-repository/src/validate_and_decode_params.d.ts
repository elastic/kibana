import type { KibanaRequest } from '@kbn/core-http-server';
import type { ZodParamsObject, IoTsParamsObject } from '@kbn/server-route-repository-utils';
export declare function validateAndDecodeParams(request: KibanaRequest, paramsSchema: ZodParamsObject | IoTsParamsObject | undefined): import("@kbn/server-route-repository-utils/src/typings").RouteParams | undefined;
