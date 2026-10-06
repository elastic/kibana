import type { Router } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from 'openapi-types';
import type { OasConverter } from './oas_converter';
import type { GetOpId } from './util';
import type { Env, GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { InternalRouterRoute } from './type';
export interface ProcessRouterOptions {
    appRouter: Router;
    converter: OasConverter;
    getOpId: GetOpId;
    filters: GenerateOpenApiDocumentOptionsFilters;
    env?: Env;
}
export declare const processRouter: ({ appRouter, converter, getOpId, filters, env, }: ProcessRouterOptions) => Promise<{
    paths: OpenAPIV3.PathsObject<{}, {}>;
}>;
export declare const extractResponses: (route: InternalRouterRoute, converter: OasConverter) => OpenAPIV3.ResponsesObject;
