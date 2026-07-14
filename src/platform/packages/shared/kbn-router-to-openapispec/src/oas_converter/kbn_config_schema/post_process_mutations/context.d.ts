import type { OpenAPIV3 } from 'openapi-types';
import type { Env } from '../../../generate_oas';
/**
 * Behaviour when a shared schema is registered under an id that is already
 * present in the registry with a different shape.
 *
 * - `'throw'` (default): raise {@link OasSchemaCollisionError} with a diff of
 *   the conflicting properties. Catches silent overwrite bugs at OAS generate
 *   time (see https://github.com/elastic/kibana/issues/271809).
 * - `'warn'`: log a warning and let the new shape win (transitional).
 * - `'ignore'`: keep the existing legacy semantics (last-write-wins, silent).
 */
export type OnCollision = 'throw' | 'warn' | 'ignore';
export interface IContext {
    addSharedSchema: (id: string, schema: OpenAPIV3.SchemaObject) => void;
    derefSharedSchema: (id: string) => OpenAPIV3.SchemaObject | undefined;
    getSharedSchemas: () => {
        [id: string]: OpenAPIV3.SchemaObject;
    };
    getEnv: () => Env;
}
interface Options {
    sharedSchemas?: Map<string, OpenAPIV3.SchemaObject>;
    env?: Env;
    onCollision?: OnCollision;
}
declare class Context implements IContext {
    private readonly sharedSchemas;
    private readonly namespace?;
    private readonly env;
    private readonly onCollision;
    constructor(opts: Options);
    addSharedSchema(id: string, schema: OpenAPIV3.SchemaObject): void;
    /** Assumes id is in the form of "#/components/schemas/my-schema-my-team" */
    derefSharedSchema(id: string): OpenAPIV3.SchemaObject | undefined;
    getSharedSchemas(): {
        [k: string]: OpenAPIV3.SchemaObject;
    };
    getEnv(): Env;
    getNamespace(): string | undefined;
}
export declare const createCtx: (opts?: Options) => Context;
export { OasSchemaCollisionError } from './schema_collision';
