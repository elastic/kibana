import type { OpenAPIV3 } from 'openapi-types';
import type { Env } from '../../../generate_oas';
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
}
declare class Context implements IContext {
    private readonly sharedSchemas;
    private readonly namespace?;
    private readonly env;
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
export {};
