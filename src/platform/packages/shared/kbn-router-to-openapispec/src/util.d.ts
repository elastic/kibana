import { OpenAPIV3 } from 'openapi-types';
import { type RouteMethod, type RouteConfigOptions, type RouteConfigOptionsBody, type RouterRoute, type RouteValidatorConfig } from '@kbn/core-http-server';
import type { CustomOperationObject, KnownParameters } from './type';
import type { GenerateOpenApiDocumentOptionsFilters } from './generate_oas';
import type { Env } from './generate_oas';
/**
 * Given an array of tags ([oas-tag:beep, oas-tag:boop]) will return a new array
 * with the tag prefix removed.
 */
export declare const extractTags: (tags?: readonly string[]) => string[];
/**
 * Build the top-level tags entry based on the paths we extracted. We could
 * handle this while we are iterating over the routes, but this approach allows
 * us to keep this as a global document concern at the expense of some extra
 * processing.
 */
export declare const buildGlobalTags: (paths: OpenAPIV3.PathsObject, additionalTags?: string[]) => OpenAPIV3.TagObject[];
export declare const getPathParameters: (path: string) => KnownParameters;
export declare const extractContentType: (body: undefined | RouteConfigOptionsBody) => string[];
export declare const getVersionedContentTypeString: (version: string, access: "public" | "internal", acceptedContentTypes: string[]) => string;
export declare const extractValidationSchemaFromRoute: (route: RouterRoute) => undefined | RouteValidatorConfig<unknown, unknown, unknown>;
export declare const getVersionedHeaderParam: (defaultVersion: undefined | string, versions: string[]) => OpenAPIV3.ParameterObject;
export declare const prepareRoutes: <R extends {
    path: string;
    options: {
        access?: "public" | "internal";
        excludeFromOAS?: boolean;
    };
}>(routes: R[], filters: GenerateOpenApiDocumentOptionsFilters) => R[];
export declare const assignToPaths: (paths: OpenAPIV3.PathsObject, path: string, pathObject: OpenAPIV3.PathItemObject) => void;
export declare const mergeResponseContent: (a: OpenAPIV3.ResponseObject["content"], b: OpenAPIV3.ResponseObject["content"]) => {
    content?: {
        [x: string]: OpenAPIV3.MediaTypeObject;
    } | undefined;
};
export declare const getXsrfHeaderForMethod: (method: RouteMethod, options?: RouteConfigOptions<RouteMethod>) => OpenAPIV3.ParameterObject[];
export declare const setXState: (availability: RouteConfigOptions<RouteMethod>["availability"], operation: CustomOperationObject, env: Env) => void;
export declare const getXState: (availability: {
    stability?: "experimental" | "beta" | "stable";
    since?: string;
} | undefined, env: Env) => string | undefined;
export type GetOpId = (input: {
    path: string;
    method: string;
}) => string;
/**
 * Best effort to generate operation IDs from route values
 */
export declare const createOpIdGenerator: () => GetOpId;
