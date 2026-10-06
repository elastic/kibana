import { z, isZod } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import type { ConvertOptions, KnownParameters } from '../../type';
export declare const convertQuery: (schema: unknown, opts?: ConvertOptions) => {
    query: OpenAPIV3.ParameterObject[];
    shared: {};
};
export declare const convertPathParameters: (schema: unknown, knownParameters: KnownParameters, opts?: ConvertOptions) => {
    params: OpenAPIV3.ParameterObject[];
    shared: {};
};
/** @internal Exposed for testing only — resets the `$defs` counter. */
export declare const resetDefsCounter: () => void;
/**
 * Reads the stable OAS component name for a Zod v4 schema, if one was declared
 * via `.meta({ id: '<name>' })` on the schema.
 *
 * The name must be unique across all schemas in the document and follow OpenAPI
 * component naming rules: `[a-zA-Z0-9._-]+`.
 */
export declare const registerZodV4Component: (schema: z.ZodType, name: string) => void;
export declare const convert: (schema: z.ZodTypeAny, opts?: ConvertOptions) => {
    shared: Record<string, OpenAPIV3.SchemaObject>;
    schema: OpenAPIV3.SchemaObject;
};
export declare const is: typeof isZod;
