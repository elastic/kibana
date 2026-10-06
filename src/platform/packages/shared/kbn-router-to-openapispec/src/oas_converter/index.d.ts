import type { OpenAPIV3 } from 'openapi-types';
import type { KnownParameters } from '../type';
import type { Env } from '../generate_oas';
import type { OnCollision } from './kbn_config_schema/post_process_mutations';
export interface OasConverterOptions {
    /**
     * Behaviour when a shared schema id is registered with two different shapes
     * within a single generation pass. Defaults to `'throw'`.
     *
     * @see {@link OnCollision}
     */
    onCollision?: OnCollision;
}
export declare class OasConverter {
    #private;
    constructor(env?: Env, options?: OasConverterOptions);
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
export { OasSchemaCollisionError } from './kbn_config_schema/post_process_mutations/schema_collision';
