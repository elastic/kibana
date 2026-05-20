import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, PersistableStateService, VersionedState } from '@kbn/kibana-utils-plugin/common';
import type { ExecutorState, ExecutorContainer } from './container';
import type { AnyExpressionFunctionDefinition } from '../expression_functions';
import type { ExpressionFunction } from '../expression_functions';
import type { ExecutionResult, FunctionCacheItem } from '../execution/execution';
import type { Execution } from '../execution/execution';
import type { IRegistry } from '../types';
import type { ExpressionType } from '../expression_types/expression_type';
import type { AnyExpressionTypeDefinition } from '../expression_types/types';
import type { ExpressionAstExpression } from '../ast';
import type { ExpressionValueError } from '../expression_types/specs';
import type { ExpressionExecutionParams } from '../service';
export interface ExpressionExecOptions {
    /**
     * Whether to execute expression in *debug mode*. In *debug mode* inputs and
     * outputs as well as all resolved arguments and time it took to execute each
     * function are saved and are available for introspection.
     */
    debug?: boolean;
}
export declare class TypesRegistry implements IRegistry<ExpressionType> {
    private readonly executor;
    constructor(executor: Executor);
    register(typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
    get(id: string): ExpressionType | null;
    toJS(): Record<string, ExpressionType>;
    toArray(): ExpressionType[];
}
export declare class FunctionsRegistry implements IRegistry<ExpressionFunction> {
    private readonly executor;
    constructor(executor: Executor);
    register(functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
    get(id: string): ExpressionFunction | null;
    toJS(): Record<string, ExpressionFunction>;
    toArray(): ExpressionFunction[];
}
export declare class Executor<Context extends Record<string, unknown> = Record<string, unknown>> implements PersistableStateService<ExpressionAstExpression> {
    private readonly logger?;
    static createWithDefaults<Ctx extends Record<string, unknown> = Record<string, unknown>>(logger?: Logger, state?: ExecutorState<Ctx>): Executor<Ctx>;
    readonly container: ExecutorContainer<Context>;
    /**
     * @deprecated
     */
    readonly functions: FunctionsRegistry;
    /**
     * @deprecated
     */
    readonly types: TypesRegistry;
    private functionCache;
    constructor(logger?: Logger | undefined, state?: ExecutorState<Context>, functionCache?: Map<string, FunctionCacheItem>);
    get state(): ExecutorState<Context>;
    registerFunction(functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
    getFunction(name: string, namespace?: string): ExpressionFunction | undefined;
    getFunctions(namespace?: string): Record<string, ExpressionFunction>;
    registerType(typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
    getType(name: string): ExpressionType | undefined;
    getTypes(): Record<string, ExpressionType>;
    get context(): Record<string, unknown>;
    /**
     * Execute expression and return result.
     *
     * @param ast Expression AST or a string representing expression.
     * @param input Initial input to the first expression function.
     * @param context Extra global context object that will be merged into the
     *    expression global context object that is provided to each function to allow side-effects.
     */
    run<Input, Output>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): Observable<ExecutionResult<Output | ExpressionValueError>>;
    createExecution<Input = unknown, Output = unknown>(ast: string | ExpressionAstExpression, params?: ExpressionExecutionParams): Execution<Input, Output>;
    private walkAst;
    private walkAstAndTransform;
    inject(ast: ExpressionAstExpression, references: SavedObjectReference[]): ExpressionAstExpression;
    extract(ast: ExpressionAstExpression): {
        state: ExpressionAstExpression;
        references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
    };
    telemetry(ast: ExpressionAstExpression, telemetryData: Record<string, unknown>): Record<string, unknown>;
    getAllMigrations(): MigrateFunctionsObject;
    migrateToLatest(state: VersionedState): ExpressionAstExpression;
    private migrate;
}
