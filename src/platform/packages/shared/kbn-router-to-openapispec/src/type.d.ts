import type { Router } from '@kbn/core-http-router-server-internal';
import type { OpenAPIV3 } from '../openapi-types';
import type { Env } from './generate_oas';
export type { OpenAPIV3 } from '../openapi-types';
export interface KnownParameters {
    [paramName: string]: {
        optional: boolean;
    };
}
export interface ConvertOptions {
    sharedSchemas?: Map<string, OpenAPIV3.SchemaObject>;
    env?: Env;
}
export interface OpenAPIConverter {
    convertPathParameters(schema: unknown, knownPathParameters: KnownParameters): {
        params: OpenAPIV3.ParameterObject[];
        shared: {
            [key: string]: OpenAPIV3.SchemaObject;
        };
    };
    convertQuery(schema: unknown): {
        query: OpenAPIV3.ParameterObject[];
        shared: {
            [key: string]: OpenAPIV3.SchemaObject;
        };
    };
    convert(schema: unknown, opts?: ConvertOptions): {
        schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
        shared: {
            [key: string]: OpenAPIV3.SchemaObject;
        };
    };
    is(type: unknown): boolean;
}
export type CustomOperationObject = OpenAPIV3.OperationObject<{
    'x-state'?: string;
}>;
export type InternalRouterRoute = ReturnType<Router['getRoutes']>[0];
