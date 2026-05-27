import type { ProcedureSchemas } from '../../common';
export interface ProcedureDefinition<Context extends object | void = void, I extends object | void = void, O = any> {
    fn: (context: Context, input: I extends void ? undefined : I) => Promise<O>;
    schemas?: ProcedureSchemas;
}
export declare class RpcService<Context extends object | void = void, Names extends string = string> {
    private registry;
    register(name: Names, definition: ProcedureDefinition<Context>): void;
    call(context: Context, name: Names, input?: unknown): Promise<{
        result: unknown;
    }>;
}
