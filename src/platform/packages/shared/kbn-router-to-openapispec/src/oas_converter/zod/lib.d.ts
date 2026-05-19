import { z, isZod } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import type { ConvertOptions, KnownParameters } from '../../type';
export declare const convertQuery: (schema: unknown) => {
    query: OpenAPIV3.ParameterObject[];
    shared: {};
};
export declare const convertPathParameters: (schema: unknown, knownParameters: KnownParameters) => {
    params: OpenAPIV3.ParameterObject[];
    shared: {};
};
/** @internal Exposed for testing only — resets the `$defs` counter. */
export declare const resetDefsCounter: () => void;
/**
 * Register a Zod schema so that the OAS converter emits it as a named
 * component (`$ref: '#/components/schemas/<name>'`) instead of inlining it.
 *
 * These fields are merged verbatim into the generated OAS component schema,
 * filling the gap where Zod/JSON Schema cannot express OAS-native concepts.
 *
 * Example:
 * ```ts
 * export const StreamDefinition = z.union([...]).meta({
 *   id: 'StreamDefinition',
 *   openapi: {
 *     discriminator: {
 *       propertyName: 'type',
 *       mapping: { wired: '#/components/schemas/WiredStreamDefinition' },
 *     },
 *   },
 * });
 * ```
 */
export interface OasMetaExtensions {
    discriminator?: OpenAPIV3.DiscriminatorObject;
    availability?: {
        stability?: 'experimental' | 'beta' | 'stable';
        since?: string;
    };
}
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
