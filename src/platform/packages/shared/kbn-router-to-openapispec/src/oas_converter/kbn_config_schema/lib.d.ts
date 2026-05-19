import joi from 'joi';
import type { OpenAPIV3 } from 'openapi-types';
import type { ConvertOptions, KnownParameters } from '../../type';
export declare const isNullableObjectType: (schema: joi.Schema | joi.Description) => boolean;
export declare const unwrapKbnConfigSchema: (schema: unknown) => joi.Schema;
export declare const convert: (kbnConfigSchema: unknown, { sharedSchemas, env }?: ConvertOptions) => {
    schema: OpenAPIV3.SchemaObject;
    shared: {
        [id: string]: OpenAPIV3.SchemaObject;
    };
};
export declare const getParamSchema: (knownParameters: KnownParameters, schemaKey: string) => {
    optional: boolean;
};
export declare const convertQuery: (kbnConfigSchema: unknown) => {
    query: {
        name: string;
        in: string;
        required: boolean;
        schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
        description: string | undefined;
    }[];
    shared: {
        [k: string]: OpenAPIV3.SchemaObject;
    };
};
export declare const convertPathParameters: (kbnConfigSchema: unknown, knownParameters: {
    [paramName: string]: {
        optional: boolean;
    };
}) => {
    params: {
        name: string;
        in: string;
        required: boolean;
        schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
        description: string | undefined;
    }[];
    shared: {
        [k: string]: OpenAPIV3.SchemaObject;
    };
};
export declare const is: (schema: unknown) => boolean;
