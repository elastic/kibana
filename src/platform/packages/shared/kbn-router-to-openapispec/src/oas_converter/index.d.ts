import type { OpenAPIV3 } from 'openapi-types';
import type { KnownParameters } from '../type';
import type { Env } from '../generate_oas';
export declare class OasConverter {
    #private;
    constructor(env?: Env);
    derefSharedSchema(id: string): OpenAPIV3.SchemaObject | undefined;
    convert(schema: unknown): OpenAPIV3.SchemaObject;
    convertPathParameters(schema: unknown, pathParameters: KnownParameters): OpenAPIV3.ParameterObject[];
    convertQuery(schema: unknown): OpenAPIV3.ParameterObject[];
    getSchemaComponents(): {
        schemas: {
            [k: string]: OpenAPIV3.SchemaObject;
        };
    };
}
