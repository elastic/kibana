/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable */

/// <reference types="node" />

import { AllowedSchemaBooleanTypes, AllowedSchemaNumberTypes, AllowedSchemaStringTypes, AllowedSchemaTypes, AnalyticsClient, AnalyticsClientInitContext, ContextProviderName, ContextProviderOpts, Event as Event$1, EventContext, EventType, EventTypeOpts, IShipper, OptInConfig, OptInConfigPerType, PossibleSchemaTypes, RegisterShipperOpts, RootSchema, SchemaArray, SchemaChildValue, SchemaMeta, SchemaMetaOptional, SchemaObject, SchemaValue, ShipperClassConstructor, ShipperName, TelemetryCounter, TelemetryCounterType } from '@elastic/ebt/client';
import { EcsAgent, EcsAs as EcsAutonomousSystem, EcsBase, EcsClient, EcsCloud, EcsContainer, EcsDestination, EcsDns, EcsError, EcsEvent, EcsFile, EcsGroup, EcsHost, EcsHttp, EcsLog, EcsNetwork, EcsObserver, EcsOrganization, EcsPackage, EcsProcess, EcsRegistry, EcsRelated, EcsRule, EcsServer, EcsService, EcsSource, EcsThreat, EcsTls, EcsTracing, EcsUrl, EcsUser, EcsUserAgent, EcsVulnerability } from '@elastic/ecs';
import { Client, TransportRequestOptionsWithOutMeta, errors, estypes } from '@elastic/elasticsearch';
import * as api from '@elastic/elasticsearch/lib/api/types';
import api from '@elastic/elasticsearch/lib/api/types';
import { AggregationsAggregationContainer, MappingProperty as EsMappingProperty, MappingPropertyBase as EsMappingPropertyBase, PropertyName as EsPropertyName, QueryDslQueryContainer, SortOrder, SortResults } from '@elastic/elasticsearch/lib/api/types';
import { ConnectionRequestParams } from '@elastic/transport';
import Boom from '@hapi/boom';
import { Payload } from '@hapi/boom';
import { Request as Request$1, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import { EvaluationContext as OpenFeatureEvaluationContext } from '@openfeature/core';
import { Provider } from '@openfeature/server-sdk';
import apm from 'elastic-apm-node';
import { EventEmitter } from 'events';
import { IncomingHttpHeaders } from 'http';
import { Container } from 'inversify';
import * as Joi from 'joi';
import { Reference as JoiReference, Schema } from 'joi';
import { Duration, isDuration } from 'moment';
import { OpenAPIV3 } from 'openapi-types';
import { EventLoopUtilization } from 'perf_hooks';
import { Observable } from 'rxjs';
import { Readable, Stream, Transform } from 'stream';
import { DetailedPeerCertificate, PeerCertificate } from 'tls';

declare abstract class Type<V> {
	readonly type: V;
	readonly __isKbnConfigSchemaType = true;
	/**
	 * Internal "schema" backed by Joi.
	 * @type {Schema}
	 */
	protected readonly internalSchema: Joi.Schema;
	protected constructor(schema: Joi.Schema, options?: TypeOptions<V>);
	extendsDeep(newOptions: ExtendsDeepOptions): Type<V>;
	/**
	 * Validates the provided value against this schema.
	 * If valid, the resulting output will be returned, otherwise an exception will be thrown.
	 */
	validate(value: unknown, context?: Record<string, unknown>, namespace?: string, validationOptions?: SchemaValidationOptions): V;
	/**
	 * @note intended for internal use, if you need to use this please contact
	 *       the core team to discuss your use case.
	 */
	getSchema(): Joi.Schema;
	getSchemaStructure(): SchemaStructureEntry[];
	protected handleError(type: string, context: Record<string, any>, path: string[]): string | SchemaTypeError | void;
	private onError;
}
declare class ByteSizeValue {
	private readonly valueInBytes;
	static parse(text: string): ByteSizeValue;
	constructor(valueInBytes: number);
	isGreaterThan(other: ByteSizeValue): boolean;
	isLessThan(other: ByteSizeValue): boolean;
	isEqualTo(other: ByteSizeValue): boolean;
	getValueInBytes(): number;
	toString(returnUnit?: ByteSizeValueUnit): string;
}
declare class ConditionalType<A extends ConditionalTypeValue, B, C> extends Type<B | C> {
	private readonly leftOperand;
	private readonly rightOperand;
	private readonly equalType;
	private readonly notEqualType;
	private readonly options?;
	constructor(leftOperand: Reference<A>, rightOperand: Reference<A> | A | Type<unknown>, equalType: Type<B>, notEqualType: Type<C>, options?: TypeOptions<B | C>);
	extendsDeep(options: ExtendsDeepOptions): ConditionalType<A, B, C>;
	protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
declare class Execution<Input = unknown, Output = unknown, InspectorAdapters extends Adapters = ExpressionExecutionParams["inspectorAdapters"] extends object ? ExpressionExecutionParams["inspectorAdapters"] : DefaultInspectorAdapters> {
	#private;
	readonly execution: ExecutionParams;
	private readonly logger?;
	private readonly functionCache;
	/**
	 * Dynamic state of the execution.
	 */
	readonly state: ExecutionContainer<ExecutionResult<Output | ExpressionValueError>>;
	/**
	 * Initial input of the execution.
	 *
	 * N.B. It is initialized to `null` rather than `undefined` for legacy reasons,
	 * because in legacy interpreter it was set to `null` by default.
	 */
	input: Input;
	/**
	 * Input of the started execution.
	 */
	private input$;
	/**
	 * Execution context - object that allows to do side-effects. Context is passed
	 * to every function.
	 */
	readonly context: ExecutionContext<InspectorAdapters>;
	/**
	 * AbortController to cancel this Execution.
	 */
	private readonly abortController;
	/**
	 * Whether .start() method has been called.
	 */
	private hasStarted;
	/**
	 * Future that tracks result or error of this execution.
	 */
	readonly result: Observable<ExecutionResult<Output | ExpressionValueError>>;
	/**
	 * Keeping track of any child executions
	 * Needed to cancel child executions in case parent execution is canceled
	 * @internal
	 */
	private readonly childExecutions;
	private cacheTimeout;
	/**
	 * Contract is a public representation of `Execution` instances. Contract we
	 * can return to other plugins for their consumption.
	 */
	readonly contract: ExecutionContract<Input, Output, InspectorAdapters>;
	readonly expression: string;
	get inspectorAdapters(): InspectorAdapters;
	constructor(execution: ExecutionParams, logger?: Logger | undefined, functionCache?: Map<string, FunctionCacheItem>);
	/**
	 * Stop execution of expression.
	 */
	cancel(reason?: AbortReason): void;
	/**
	 * Call this method to start execution.
	 *
	 * N.B. `input` is initialized to `null` rather than `undefined` for legacy reasons,
	 * because in legacy interpreter it was set to `null` by default.
	 */
	start(input?: Input, isSubExpression?: boolean): Observable<ExecutionResult<Output | ExpressionValueError>>;
	invokeChain<ChainOutput = unknown>([head, ...tail]: ExpressionAstFunction[], input: unknown): Observable<ChainOutput | ExpressionValueError>;
	invokeFunction<Fn extends ExpressionFunction>(fn: Fn, input: unknown, args: Record<string, unknown>): Observable<UnwrapReturnType<Fn["fn"]>>;
	cast<Type = unknown>(value: unknown, toTypeNames?: string[]): Type;
	validate<Type = unknown>(value: Type, argDef: ExpressionFunctionParameter<Type>): void;
	resolveArgs<Fn extends ExpressionFunction>(fnDef: Fn, input: unknown, argAsts: Record<string, ExpressionAstArgument[]>): Observable<Record<string, unknown> | ExpressionValueError>;
	interpret<T>(ast: ExpressionAstNode, input: T): Observable<ExecutionResult<unknown>>;
}
declare class ExecutionContract<Input = unknown, Output = unknown, InspectorAdapters extends Adapters = object> {
	get isPending(): boolean;
	protected readonly execution: Execution<Input, Output, InspectorAdapters>;
	constructor(execution: Execution<Input, Output, InspectorAdapters>);
	/**
	 * Cancel the execution of the expression. This will set abort signal
	 * (available in execution context) to aborted state, letting expression
	 * functions to stop their execution.
	 */
	cancel: (reason?: AbortReason) => void;
	/**
	 * Returns the final output of expression, if any error happens still
	 * wraps that error into `ExpressionValueError` type and returns that.
	 * This function never throws.
	 */
	getData: () => Observable<ExecutionResult<Output | ExpressionValueError>>;
	/**
	 * Get string representation of the expression. Returns the original string
	 * if execution was started from a string. If execution was started from an
	 * AST this method returns a string generated from AST.
	 */
	getExpression: () => string;
	/**
	 * Get AST used to execute the expression.
	 */
	getAst: () => ExpressionAstExpression;
	/**
	 * Get Inspector adapters provided to all functions of expression through
	 * execution context.
	 */
	inspect: () => Adapters;
}
declare class Executor<Context extends Record<string, unknown> = Record<string, unknown>> implements PersistableStateService<ExpressionAstExpression> {
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
	inject(ast: ExpressionAstExpression, references: SavedObjectReference$1[]): ExpressionAstExpression;
	extract(ast: ExpressionAstExpression): {
		state: ExpressionAstExpression;
		references: SavedObjectReference[];
	};
	telemetry(ast: ExpressionAstExpression, telemetryData: Record<string, unknown>): Record<string, unknown>;
	getAllMigrations(): MigrateFunctionsObject;
	migrateToLatest(state: VersionedState): ExpressionAstExpression;
	private migrate;
}
declare class ExpressionFunction implements PersistableState<ExpressionAstFunction["arguments"]> {
	/**
	 * Name of function
	 */
	name: string;
	namespace?: string;
	/**
	 * Aliases that can be used instead of `name`.
	 */
	aliases: string[];
	/**
	 * Return type of function. This SHOULD be supplied. We use it for UI
	 * and autocomplete hinting. We may also use it for optimizations in
	 * the future.
	 */
	type: string;
	/**
	 * Opt-in to caching this function. By default function outputs are cached and given the same inputs cached result is returned.
	 */
	allowCache: boolean | {
		withSideEffects: (params: Record<string, unknown>, handlers: object) => () => void;
	};
	/**
	 * Function to run function (context, args)
	 */
	fn: (input: ExpressionValue, params: Record<string, unknown>, handlers: object) => ExpressionValue;
	/**
	 * A short help text.
	 */
	help: string;
	/**
	 * Specification of expression function parameters.
	 */
	args: Record<string, ExpressionFunctionParameter>;
	/**
	 * Type of inputs that this function supports.
	 */
	inputTypes: string[] | undefined;
	disabled: boolean;
	/**
	 * Deprecation flag.
	 */
	deprecated: boolean;
	telemetry: (state: ExpressionAstFunction["arguments"], telemetryData: Record<string, unknown>) => Record<string, unknown>;
	extract: (state: ExpressionAstFunction["arguments"]) => {
		state: ExpressionAstFunction["arguments"];
		references: SavedObjectReference$1[];
	};
	inject: (state: ExpressionAstFunction["arguments"], references: SavedObjectReference$1[]) => ExpressionAstFunction["arguments"];
	migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
	constructor(functionDefinition: AnyExpressionFunctionDefinition);
	accepts: (type: string) => boolean;
}
declare class ExpressionFunctionParameter<T = unknown> {
	name: string;
	required: boolean;
	help: string;
	types: ArgumentType<T>["types"];
	default?: ArgumentType<T>["default"];
	aliases: string[];
	deprecated: boolean;
	multi: boolean;
	resolve: boolean;
	/**
	 * @deprecated
	 */
	strict?: boolean;
	options: T[];
	constructor(name: string, arg: ArgumentType<T>);
	accepts(type: string): boolean;
}
declare class ExpressionRenderer<Config = unknown> {
	readonly name: string;
	readonly namespace?: string;
	readonly displayName: string;
	readonly help: string;
	readonly validate: () => void | Error;
	readonly reuseDomNode: boolean;
	readonly render: ExpressionRenderDefinition<Config>["render"];
	constructor(config: ExpressionRenderDefinition<Config>);
}
declare class ExpressionRendererRegistry implements IRegistry<ExpressionRenderer> {
	private readonly renderers;
	register(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
	get(id: string): ExpressionRenderer | null;
	toJS(): Record<string, ExpressionRenderer>;
	toArray(): ExpressionRenderer[];
}
declare class ExpressionType {
	name: string;
	namespace?: string;
	/**
	 * A short help text.
	 */
	help: string;
	/**
	 * Type validation, useful for checking function output.
	 */
	validate: (type: unknown) => void | Error;
	create: unknown;
	/**
	 * Optional serialization (used when passing context around client/server).
	 */
	serialize?: (value: Serializable) => unknown;
	deserialize?: (serialized: unknown[]) => Serializable;
	private readonly definition;
	constructor(definition: AnyExpressionTypeDefinition);
	getToFn: (typeName: string) => undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue>;
	getFromFn: (typeName: string) => undefined | ExpressionValueConverter<ExpressionValue, ExpressionValue>;
	castsTo: (value: ExpressionValue) => boolean;
	castsFrom: (value: ExpressionValue) => boolean;
	to: (value: ExpressionValue, toTypeName: string, types: Record<string, ExpressionType>) => any;
	from: (value: ExpressionValue, types: Record<string, ExpressionType>) => any;
}
declare class ExpressionsInspectorAdapter extends EventEmitter {
	private _ast;
	logAST(ast: ExpressionAstNode): void;
	get ast(): ExpressionAstNode;
}
declare class ExpressionsService implements PersistableStateService<ExpressionAstExpression>, ExpressionsServiceSetup, ExpressionsServiceStart {
	/**
	 * @note Workaround since the expressions service is frozen.
	 */
	private static started;
	readonly executor: Executor;
	readonly renderers: ExpressionRendererRegistry;
	constructor({ logger, executor, renderers, }?: ExpressionServiceParams);
	private isStarted;
	private assertSetup;
	private assertStart;
	readonly getFunction: ExpressionsServiceStart["getFunction"];
	readonly getFunctions: ExpressionsServiceStart["getFunctions"];
	readonly getRenderer: ExpressionsServiceStart["getRenderer"];
	readonly getRenderers: ExpressionsServiceStart["getRenderers"];
	readonly getType: ExpressionsServiceStart["getType"];
	readonly getTypes: ExpressionsServiceStart["getTypes"];
	readonly registerFunction: ExpressionsServiceSetup["registerFunction"];
	readonly registerType: ExpressionsServiceSetup["registerType"];
	readonly registerRenderer: ExpressionsServiceSetup["registerRenderer"];
	readonly fork: ExpressionsServiceSetup["fork"];
	readonly execute: ExpressionsServiceStart["execute"];
	readonly run: ExpressionsServiceStart["run"];
	/**
	 * Extracts telemetry from expression AST
	 * @param state expression AST to extract references from
	 */
	readonly telemetry: (state: ExpressionAstExpression, telemetryData?: Record<string, unknown>) => Record<string, unknown>;
	/**
	 * Extracts saved object references from expression AST
	 * @param state expression AST to extract references from
	 * @returns new expression AST with references removed and array of references
	 */
	readonly extract: (state: ExpressionAstExpression) => {
		state: ExpressionAstExpression;
		references: SavedObjectReference[];
	};
	/**
	 * Injects saved object references into expression AST
	 * @param state expression AST to update
	 * @param references array of saved object references
	 * @returns new expression AST with references injected
	 */
	readonly inject: (state: ExpressionAstExpression, references: SavedObjectReference$1[]) => ExpressionAstExpression;
	/**
	 * gets an object with semver mapped to a migration function
	 */
	getAllMigrations: () => MigrateFunctionsObject;
	/**
	 * migrates an old expression to latest version
	 * @param state
	 */
	migrateToLatest: (state: VersionedState) => ExpressionAstExpression;
	/**
	 * Returns Kibana Platform *setup* life-cycle contract. Useful to return the
	 * same contract on server-side and browser-side.
	 */
	setup(...args: unknown[]): ExpressionsServiceSetup;
	/**
	 * Returns Kibana Platform *start* life-cycle contract. Useful to return the
	 * same contract on server-side and browser-side.
	 */
	start(...args: unknown[]): ExpressionsServiceStart;
	stop(): void;
}
declare class ExpressionsServiceFork implements ExpressionServiceFork {
	private namespace;
	private expressionsService;
	/**
	 * @note Workaround since the expressions service is frozen.
	 */
	constructor(namespace: string, expressionsService: ExpressionsService);
	protected registerFunction(definition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
	protected registerRenderer(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
	protected registerType(definition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
	protected run<Input, Output>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): import("rxjs").Observable<ExecutionResult<ExpressionValueError | Output>>;
	protected execute<Input = unknown, Output = unknown>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): ExecutionContract<Input, Output, object>;
	protected getFunction(name: string): ExpressionFunction | undefined;
	protected getFunctions(): Record<string, ExpressionFunction>;
	/**
	 * Returns Kibana Platform *setup* life-cycle contract. Useful to return the
	 * same contract on server-side and browser-side.
	 */
	setup(): ExpressionsServiceSetup;
	/**
	 * Returns Kibana Platform *start* life-cycle contract. Useful to return the
	 * same contract on server-side and browser-side.
	 */
	start(): ExpressionsServiceStart;
}
declare class FunctionsRegistry implements IRegistry<ExpressionFunction> {
	private readonly executor;
	constructor(executor: Executor);
	register(functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
	get(id: string): ExpressionFunction | null;
	toJS(): Record<string, ExpressionFunction>;
	toArray(): ExpressionFunction[];
}
declare class LogLevel {
	readonly id: LogLevelId;
	readonly value: number;
	static readonly Off: LogLevel;
	static readonly Fatal: LogLevel;
	static readonly Error: LogLevel;
	static readonly Warn: LogLevel;
	static readonly Info: LogLevel;
	static readonly Debug: LogLevel;
	static readonly Trace: LogLevel;
	static readonly All: LogLevel;
	/**
	 * Converts string representation of log level into `LogLevel` instance.
	 * @param level - String representation of log level.
	 * @returns Instance of `LogLevel` class.
	 */
	static fromId(level: LogLevelId): LogLevel;
	private constructor();
	/**
	 * Indicates whether current log level covers the one that is passed as an argument.
	 * @param level - Instance of `LogLevel` to compare to.
	 * @returns True if specified `level` is covered by this log level.
	 */
	supports(level: LogLevel): boolean;
}
declare class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
	private props;
	private options;
	private propSchemas;
	constructor(props: P, options?: ObjectTypeOptions<P>);
	/**
	 * Return a new `ObjectType` instance extended with given `newProps` properties.
	 * Original properties can be deleted from the copy by passing a `null` or `undefined` value for the key.
	 *
	 * @example
	 * How to add a new key to an object schema
	 * ```ts
	 * const origin = schema.object({
	 *   initial: schema.string(),
	 * });
	 *
	 * const extended = origin.extends({
	 *   added: schema.number(),
	 * });
	 * ```
	 *
	 * How to remove an existing key from an object schema
	 * ```ts
	 * const origin = schema.object({
	 *   initial: schema.string(),
	 *   toRemove: schema.number(),
	 * });
	 *
	 * const extended = origin.extends({
	 *   toRemove: undefined,
	 * });
	 * ```
	 *
	 * How to override the schema's options
	 * ```ts
	 * const origin = schema.object({
	 *   initial: schema.string(),
	 * }, { defaultValue: { initial: 'foo' }});
	 *
	 * const extended = origin.extends({
	 *   added: schema.number(),
	 * }, { defaultValue: { initial: 'foo', added: 'bar' }});
	 *
	 * @remarks
	 * `extends` only support extending first-level properties. It's currently not possible to perform deep/nested extensions.
	 *
	 * ```ts
	 * const origin = schema.object({
	 *   foo: schema.string(),
	 *   nested: schema.object({
	 *     a: schema.string(),
	 *     b: schema.string(),
	 *   }),
	 * });
	 *
	 * const extended = origin.extends({
	 *   nested: schema.object({
	 *     c: schema.string(),
	 *   }),
	 * });
	 *
	 * // TypeOf<typeof extended> is `{ foo: string; nested: { c: string } }`
	 * ```
	 */
	extends<NP extends NullableProps>(newProps: NP, newOptions?: ExtendedObjectTypeOptions<P, NP>): ExtendedObjectType<P, NP>;
	extendsDeep(options: ExtendsDeepOptions): ObjectType<P>;
	protected handleError(type: string, { reason, value }: Record<string, any>): any;
	/**
	 * Return the schema for this object's underlying properties
	 */
	getPropSchemas(): P;
	validateKey(key: string, value: any): any;
}
declare class Reference<T> {
	static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V>;
	private readonly internalSchema;
	constructor(key: string);
	getSchema(): Joi.JoiReference;
}
declare class RequestAdapter extends EventEmitter {
	private requests;
	private responses;
	constructor();
	/**
	 * Start logging a new request into this request adapter. The new request will
	 * by default be in a processing state unless you explicitly finish it via
	 * {@link RequestResponder#finish}, {@link RequestResponder#ok} or
	 * {@link RequestResponder#error}.
	 *
	 * @param  {string} name The name of this request as it should be shown in the UI.
	 * @param  {RequestParams} params Additional arguments for the request.
	 * @param  {number} [startTime] Set an optional start time for the request
	 * @return {RequestResponder} An instance to add information to the request and finish it.
	 */
	start(name: string, params?: RequestParams, startTime?: number): RequestResponder;
	loadFromEntries(requests: Map<string, Request$1>, responses: WeakMap<Request$1, RequestResponder>): void;
	reset(): void;
	resetRequest(id: string): void;
	getRequests(): Request$1[];
	getRequestsSince(time: number): Request$1[];
	getRequestEntries(): Array<[
		Request$1,
		RequestResponder
	]>;
	private _onChange;
}
declare class RequestResponder {
	private readonly request;
	private readonly onChange;
	constructor(request: Request$1, onChange: () => void);
	json(reqJson: object): RequestResponder;
	stats(stats: RequestStatistics): RequestResponder;
	finish(status: RequestStatus, response: Response$1): void;
	ok(response: Response$1): void;
	error(response: Response$1): void;
}
declare class RouteValidationError extends SchemaTypeError {
	constructor(error: Error | string, path?: string[]);
}
declare class SchemaError extends Error {
	cause?: Error;
	constructor(message: string, cause?: Error);
}
declare class SchemaTypeError extends SchemaError {
	readonly path: string[];
	constructor(error: Error | string, path: string[]);
}
declare class TablesAdapter extends EventEmitter {
	#private;
	allowCsvExport: boolean;
	/** Key of table to set as initial selection */
	initialSelectedTable?: string;
	logDatatable(key: string, datatable: Datatable): void;
	reset(): void;
	get tables(): {
		[key: string]: Datatable;
	};
}
declare class TypesRegistry implements IRegistry<ExpressionType> {
	private readonly executor;
	constructor(executor: Executor);
	register(typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
	get(id: string): ExpressionType | null;
	toJS(): Record<string, ExpressionType>;
	toArray(): ExpressionType[];
}
declare const KIBANA_PROJECTS: readonly [
	"oblt",
	"security",
	"es",
	"workplaceai"
];
declare const ServiceStatusLevels: Readonly<{
	available: Readonly<{
		toString: () => "available";
		valueOf: () => 0;
		toJSON: () => "available";
	}>;
	degraded: Readonly<{
		toString: () => "degraded";
		valueOf: () => 1;
		toJSON: () => "degraded";
	}>;
	unavailable: Readonly<{
		toString: () => "unavailable";
		valueOf: () => 2;
		toJSON: () => "unavailable";
	}>;
	critical: Readonly<{
		toString: () => "critical";
		valueOf: () => 3;
		toJSON: () => "critical";
	}>;
}>;
declare const SharedGlobalConfigKeys: {
	elasticsearch: readonly [
		"shardTimeout",
		"requestTimeout"
	];
	path: readonly [
		"data"
	];
	savedObjects: readonly [
		"maxImportPayloadBytes"
	];
};
declare const code: unique symbol;
declare const config: {
	path: string;
	schema: ObjectType<{
		data: Type<string>;
	}>;
};
declare const configSchema: ObjectType<{
	sniffOnStart: Type<boolean>;
	sniffInterval: Type<false | Duration>;
	sniffOnConnectionFault: Type<boolean>;
	hosts: Type<string | string[]>;
	maxSockets: Type<number>;
	maxIdleSockets: Type<number>;
	maxResponseSize: Type<false | ByteSizeValue>;
	idleSocketTimeout: Type<Duration>;
	compression: Type<boolean>;
	username: Type<string | undefined>;
	password: Type<string | undefined>;
	serviceAccountToken: Type<string | undefined>;
	requestHeadersWhitelist: ConditionalType<true, string | string[], string | string[]>;
	customHeaders: Type<Record<string, string>>;
	shardTimeout: Type<Duration>;
	requestTimeout: Type<Duration>;
	pingTimeout: Type<Duration>;
	logQueries: Type<boolean>;
	ssl: ObjectType<{
		verificationMode: Type<"full" | "certificate" | "none">;
		certificateAuthorities: Type<string | string[] | undefined>;
		certificate: Type<string | undefined>;
		key: Type<string | undefined>;
		keyPassphrase: Type<string | undefined>;
		keystore: ObjectType<{
			path: Type<string | undefined>;
			password: Type<string | undefined>;
		}>;
		truststore: ObjectType<{
			path: Type<string | undefined>;
			password: Type<string | undefined>;
		}>;
		alwaysPresentCertificate: Type<boolean>;
	}>;
	apiVersion: Type<string>;
	healthCheck: ObjectType<{
		delay: Type<Duration>;
		startupDelay: Type<Duration>;
		retry: Type<number>;
	}>;
	ignoreVersionMismatch: ConditionalType<true, boolean, boolean>;
	skipStartupConnectionCheck: ConditionalType<true, boolean, boolean>;
	apisToRedactInLogs: Type<Readonly<{
		method?: string | undefined;
	} & {
		path: string;
	}>[]>;
	dnsCacheTtl: Type<Duration>;
	publicBaseUrl: Type<string | undefined>;
}>;
declare const name$1 = "datatable";
declare const pricingProductsSchema: Type<Readonly<{} & {
	name: "observability";
	tier: "complete" | "logs_essentials";
}> | Readonly<{} & {
	name: "ai_soc";
	tier: "search_ai_lake";
}> | Readonly<{} & {
	name: "security";
	tier: "complete" | "essentials" | "search_ai_lake";
}> | Readonly<{} & {
	name: "endpoint";
	tier: "complete" | "essentials" | "search_ai_lake";
}> | Readonly<{} & {
	name: "cloud";
	tier: "complete" | "essentials" | "search_ai_lake";
}>>;
declare const soSchema: ObjectType<{
	maxImportPayloadBytes: Type<ByteSizeValue>;
	maxImportExportSize: Type<number>;
	allowHttpApiAccess: ConditionalType<true, boolean, boolean>;
	enableAccessControl: Type<boolean>;
}>;
declare const validBodyOutput: readonly [
	"data",
	"stream"
];
declare enum AbortReason {
	/**
	 * The request was aborted due to reaching the `search:timeout` advanced setting.
	 */
	TIMEOUT = "timeout",
	/**
	 * The request was aborted because the data was replaced by a new request (refreshed/re-fetched).
	 */
	REPLACED = "replaced",
	/**
	 * The request was aborted because the component unmounted or the execution context was destroyed.
	 */
	CLEANUP = "cleanup",
	/**
	 * The request was aborted because the user explicitly canceled it.
	 */
	CANCELED = "canceled"
}
declare enum AuthResultType {
	authenticated = "authenticated",
	notHandled = "notHandled",
	redirected = "redirected"
}
declare enum AuthStatus {
	/**
	 * `auth` interceptor successfully authenticated a user
	 */
	authenticated = "authenticated",
	/**
	 * `auth` interceptor failed user authentication
	 */
	unauthenticated = "unauthenticated",
	/**
	 * `auth` interceptor has not been registered
	 */
	unknown = "unknown"
}
declare enum ESQLVariableType {
	TIME_LITERAL = "time_literal",
	FIELDS = "fields",
	VALUES = "values",
	MULTI_VALUES = "multi_values",
	FUNCTIONS = "functions"
}
declare enum FilterStateStore {
	APP_STATE = "appState",
	GLOBAL_STATE = "globalState"
}
declare enum METRIC_TYPE {
	COUNT = "count",
	LOADED = "loaded",
	CLICK = "click",
	USER_AGENT = "user_agent",
	APPLICATION_USAGE = "application_usage"
}
declare enum OnPostAuthResultType {
	next = "next",
	authzResult = "authzResult"
}
declare enum OnPreAuthResultType {
	next = "next"
}
declare enum OnPreResponseResultType {
	render = "render",
	next = "next"
}
declare enum OnPreRoutingResultType {
	next = "next",
	rewriteUrl = "rewriteUrl"
}
declare enum RequestStatus {
	/**
	 * The request hasn't finished yet.
	 */
	PENDING = 0,
	/**
	 * The request has successfully finished.
	 */
	OK = 1,
	/**
	 * The request failed.
	 */
	ERROR = 2
}
export declare class ExpressionsServerPlugin implements Plugin$1<ExpressionsServerSetup, ExpressionsServerStart> {
	readonly expressions: ExpressionsService;
	constructor(context: PluginInitializerContext);
	setup(core: CoreSetup): ExpressionsServerSetup;
	start(core: CoreStart): ExpressionsServerStart;
	stop(): void;
}
export type ExpressionsServerSetup = ExpressionsServiceSetup;
export type ExpressionsServerStart = ExpressionsServiceStart;
interface APIKeys {
	/**
	 * Determines if API Keys are enabled in Elasticsearch.
	 */
	areAPIKeysEnabled(): Promise<boolean>;
	/**
	 * Determines if Cross-Cluster API Keys are enabled in Elasticsearch.
	 */
	areCrossClusterAPIKeysEnabled(): Promise<boolean>;
	/**
	 * Tries to create an API key for the current user.
	 *
	 * Returns newly created API key or `null` if API keys are disabled.
	 *
	 * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for Cross-Cluster API keys.
	 *
	 * @param request Request instance.
	 * @param createParams The params to create an API key
	 */
	create(request: KibanaRequest, createParams: CreateAPIKeyParams): Promise<CreateAPIKeyResult | null>;
	/**
	 * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
	 *
	 * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
	 *
	 * User needs `manage_api_key` privilege to update REST API keys and `manage_security` for cross-cluster API keys.
	 *
	 * @param request Request instance.
	 * @param updateParams The params to edit an API key
	 */
	update(request: KibanaRequest, updateParams: UpdateAPIKeyParams): Promise<UpdateAPIKeyResult | null>;
	/**
	 * Tries to grant an API key for the current user.
	 * @param request Request instance.
	 * @param createParams Create operation parameters.
	 */
	grantAsInternalUser(request: KibanaRequest, createParams: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams): Promise<GrantAPIKeyResult | null>;
	/**
	 * Tries to validate an API key.
	 * @param apiKeyPrams ValidateAPIKeyParams.
	 */
	validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean>;
	/**
	 * Tries to invalidate an API keys.
	 * @param request Request instance.
	 * @param params The params to invalidate an API keys.
	 */
	invalidate(request: KibanaRequest, params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
	/**
	 * Tries to invalidate the API keys by using the internal user.
	 * @param params The params to invalidate the API keys.
	 */
	invalidateAsInternalUser(params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
}
interface APIKeysServiceWithContext {
	/**
	 * Determines if API Keys are enabled in Elasticsearch.
	 */
	areAPIKeysEnabled(): Promise<boolean>;
	/**
	 * Tries to create an API key for the current user.
	 *
	 * Returns newly created API key or `null` if API keys are disabled.
	 *
	 * User needs `manage_api_key` privilege to create REST API keys and `manage_security` for Cross-Cluster API keys.
	 *
	 * @param createParams The params to create an API key
	 */
	create(createParams: CreateAPIKeyParams): Promise<CreateAPIKeyResult | null>;
	/**
	 * Attempts update an API key with the provided 'role_descriptors' and 'metadata'
	 *
	 * Returns `updated`, `true` if the update was successful, `false` if there was nothing to update
	 *
	 * User needs `manage_api_key` privilege to update REST API keys and `manage_security` for cross-cluster API keys.
	 *
	 * @param updateParams The params to edit an API key
	 */
	update(updateParams: UpdateAPIKeyParams): Promise<UpdateAPIKeyResult | null>;
	/**
	 * Tries to validate an API key.
	 * @param apiKeyPrams ValidateAPIKeyParams.
	 */
	validate(apiKeyPrams: ValidateAPIKeyParams): Promise<boolean>;
	/**
	 * Tries to invalidate an API keys.
	 * @param params The params to invalidate an API keys.
	 */
	invalidate(params: InvalidateAPIKeysParams): Promise<InvalidateAPIKeyResult | null>;
}
interface AccessControlImportTransforms {
	filterStream: Stream.Transform;
	mapStream: Stream.Transform;
}
interface Adapters {
	requests?: RequestAdapter;
	[key: string]: any;
}
interface AddVersionOpts<P, Q, B> {
	/**
	 * Version to assign to this route
	 * @public
	 */
	version: ApiVersion;
	/**
	 * Validation for this version of a route
	 * @note if providing a function to lazily load your validation schemas assume
	 *       that the function will only be called once.
	 * @public
	 */
	validate: false | VersionedRouteValidation<P, Q, B> | (() => VersionedRouteValidation<P, Q, B>);
	security?: Pick<RouteSecurity, "authz">;
	options?: {
		deprecated?: RouteDeprecationInfo;
		/**
		 * @public
		 * {@inheritdoc RouteConfigOptions['oasOperationObject']}
		 */
		oasOperationObject?: RouteConfigOptions<RouteMethod>["oasOperationObject"];
	};
}
interface ApiDeprecationDetails extends BaseDeprecationDetails {
	apiId: string;
	deprecationType: "api";
}
interface ApiKeyDescriptor {
	/**
	 *  Name of the API key.
	 */
	name: string;
	/**
	 * The ID of the API key.
	 */
	id: string;
}
interface AuditEvent extends LogMeta {
	/**
	 * Log message
	 */
	message: string;
	/**
	 * Kibana specific fields
	 */
	kibana?: AuditKibana;
	/**
	 * Fields describing an HTTP request
	 */
	http?: AuditHttp;
}
interface AuditHttp extends EcsHttp$1 {
	/**
	 * HTTP request details
	 */
	request?: AuditRequest;
}
interface AuditKibana {
	/**
	 * The ID of the space associated with this event.
	 */
	space_id?: string;
	/**
	 * The ID of the user session associated with this event. Each login attempt
	 * results in a unique session id.
	 */
	session_id?: string;
	/**
	 * Saved object that was created, changed, deleted or accessed as part of this event.
	 */
	saved_object?: {
		type: string;
		id: string;
		name?: string;
	};
	/**
	 * Name of authentication provider associated with a login event.
	 */
	authentication_provider?: string;
	/**
	 * Type of authentication provider associated with a login event.
	 */
	authentication_type?: string;
	/**
	 * Name of Elasticsearch realm that has authenticated the user.
	 */
	authentication_realm?: string;
	/**
	 * Name of Elasticsearch realm where the user details were retrieved from.
	 */
	lookup_realm?: string;
	/**
	 * Set of space IDs that a saved object was shared to.
	 */
	add_to_spaces?: readonly string[];
	/**
	 * Set of space IDs that a saved object was removed from.
	 */
	delete_from_spaces?: readonly string[];
	/**
	 * Set of space IDs that are not authorized for an action.
	 */
	unauthorized_spaces?: readonly string[];
	/**
	 * Set of types that are not authorized for an action.
	 */
	unauthorized_types?: readonly string[];
}
interface AuditLogger {
	/**
	 * Logs an {@link AuditEvent} and automatically adds meta data about the
	 * current user, space and correlation id.
	 *
	 * Guidelines around what events should be logged and how they should be
	 * structured can be found in: `/x-pack/platform/plugins/shared/security/README.md`
	 *
	 * @example
	 * ```typescript
	 * const auditLogger = securitySetup.audit.asScoped(request);
	 * auditLogger.log({
	 *   message: 'User is updating dashboard [id=123]',
	 *   event: {
	 *     action: 'saved_object_update',
	 *     outcome: 'unknown'
	 *   },
	 *   kibana: {
	 *     saved_object: { type: 'dashboard', id: '123' }
	 *   },
	 * });
	 * ```
	 */
	log: (event: AuditEvent | undefined) => void;
	/**
	 * Indicates whether audit logging is enabled or not.
	 *
	 * Useful for skipping resource-intense operations that don't need to be performed when audit
	 * logging is disabled.
	 */
	readonly enabled: boolean;
	/**
	 * Indicates whether to include saved objects names in audit log
	 */
	readonly includeSavedObjectNames: boolean;
}
interface AuditRequest extends EcsRequest {
	/**
	 * HTTP request headers
	 */
	headers?: {
		"x-forwarded-for"?: string;
	};
}
interface AuditRequestHandlerContext {
	logger: AuditLogger;
}
interface AuthRedirectedParams {
	/**
	 * Headers to attach for auth redirect.
	 * Must include "location" header
	 */
	headers: {
		location: string;
	} & ResponseHeaders;
}
interface AuthResultAuthenticated extends AuthResultParams {
	type: AuthResultType.authenticated;
}
interface AuthResultNotHandled {
	type: AuthResultType.notHandled;
}
interface AuthResultParams {
	/**
	 * Data to associate with an incoming request. Any downstream plugin may get access to the data.
	 */
	state?: Record<string, any>;
	/**
	 * Auth specific headers to attach to a request object.
	 * Used to perform a request to Elasticsearch on behalf of an authenticated user.
	 */
	requestHeaders?: AuthHeaders;
	/**
	 * Auth specific headers to attach to a response object.
	 * Used to send back authentication mechanism related headers to a client when needed.
	 */
	responseHeaders?: AuthHeaders;
}
interface AuthResultRedirected extends AuthRedirectedParams {
	type: AuthResultType.redirected;
}
interface AuthToolkit {
	/** Authentication is successful with given credentials, allow request to pass through */
	authenticated: (data?: AuthResultParams) => AuthResult;
	/**
	 * User has no credentials.
	 * Allows user to access a resource when authRequired is 'optional'
	 * Rejects a request when authRequired: true
	 * */
	notHandled: () => AuthResult;
	/**
	 * Redirects user to another location to complete authentication when authRequired: true
	 * Allows user to access a resource without redirection when authRequired: 'optional'
	 * */
	redirected: (headers: {
		location: string;
	} & ResponseHeaders) => AuthResult;
}
interface AuthcDisabled {
	enabled: false;
	reason: string;
}
interface AuthcEnabled {
	enabled: true | "optional";
}
interface AuthcRequestHandlerContext {
	getCurrentUser(): AuthenticatedUser | null;
	apiKeys: APIKeysServiceWithContext;
}
interface AuthenticatedUser extends User {
	/**
	 * The name and type of the Realm that has authenticated the user.
	 */
	authentication_realm: UserRealm;
	/**
	 * The name and type of the Realm where the user information were retrieved from.
	 */
	lookup_realm: UserRealm;
	/**
	 * The authentication provider that used to authenticate user.
	 */
	authentication_provider: AuthenticationProvider;
	/**
	 * The AuthenticationType used by ES to authenticate the user.
	 *
	 * @example "realm" | "api_key" | "token" | "anonymous" | "internal"
	 */
	authentication_type: string;
	/**
	 * Indicates whether user is authenticated via Elastic Cloud built-in SAML realm.
	 */
	elastic_cloud_user: boolean;
	/**
	 * User profile ID of this user.
	 */
	profile_uid?: string;
	/**
	 * Indicates whether user is an operator.
	 */
	operator?: boolean;
	/**
	 * Metadata of the API key that was used to authenticate the user.
	 */
	api_key?: ApiKeyDescriptor;
}
interface AuthenticationProvider {
	/**
	 * Type of the Kibana authentication provider.
	 */
	type: string;
	/**
	 * Name of the Kibana authentication provider (arbitrary string).
	 */
	name: string;
}
interface AuthorizationResult<A extends string> extends CheckAuthorizationResult<A> {
	/**
	 * A set of all inaccessible objects that were restricted due to access control
	 */
	inaccessibleObjects?: Set<ObjectRequiringPrivilegeCheckResult>;
}
interface AuthorizationTypeEntry {
	/**
	 * An array of authorized spaces for the associated type/action
	 * in the associated record/map.
	 */
	authorizedSpaces: string[];
	/**
	 * Is the associated type/action globally authorized?
	 */
	isGloballyAuthorized?: boolean;
}
interface AuthorizeAndRedactInternalBulkResolveParams<T> extends AuthorizeParams {
	/**
	 * The objects to authorize
	 */
	objects: Array<SavedObjectsResolveResponse<T> | BulkResolveError>;
}
interface AuthorizeAndRedactMultiNamespaceReferencesParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: Array<WithAuditName<SavedObjectReferenceWithContext>>;
	/**
	 * options for the operation
	 * - purpose: 'collectMultiNamespaceReferences' or 'updateObjectsSpaces'
	 * default purpose is 'collectMultiNamespaceReferences'.
	 */
	options?: MultiNamespaceReferencesOptions;
}
interface AuthorizeBulkCreateParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeCreateObject[];
}
interface AuthorizeBulkDeleteParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeObjectWithExistingSpaces[];
}
interface AuthorizeBulkGetObject extends AuthorizeObjectWithExistingSpaces {
	/**
	 * The namespaces to include when retrieving this object. Populated by options
	 * passed to the repository's update or bulkUpdate method.
	 */
	objectNamespaces?: string[];
	/**
	 * Whether or not an error occurred when getting this object. Populated by
	 * the result of a query. Default is false.
	 */
	error?: boolean;
}
interface AuthorizeBulkGetParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeBulkGetObject[];
}
interface AuthorizeBulkUpdateParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeUpdateObject[];
}
interface AuthorizeChangeAccessControlObject extends AuthorizeObjectWithExistingSpaces {
	/**
	 * The namespace in which to update this object. Populated by options
	 * passed to the repository's changeOwnership method.
	 */
	objectNamespace?: string;
}
interface AuthorizeChangeAccessControlParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeChangeAccessControlObject[];
}
interface AuthorizeCheckConflictsParams extends AuthorizeParams {
	/** The objects to authorize */
	objects: AuthorizeObject[];
}
interface AuthorizeCreateObject extends AuthorizeObjectWithExistingSpaces {
	/**
	 * Initial spaces to include the created object. Populated by options
	 * passed to the repository's bulkCreate method.
	 */
	initialNamespaces?: string[];
}
interface AuthorizeCreateParams extends AuthorizeParams {
	/** The object to authorize */
	object: AuthorizeCreateObject;
}
interface AuthorizeDeleteParams extends AuthorizeParams {
	/** The object to authorize */
	object: AuthorizeObject;
}
interface AuthorizeFindParams {
	/** The namespaces in which to find objects */
	namespaces: Set<string>;
	/** The types of objects to find */
	types: Set<string>;
}
interface AuthorizeGetParams extends AuthorizeParams {
	/** The object to authorize */
	object: AuthorizeObjectWithExistingSpaces;
	/** Whether or not the object was not found, defaults to false */
	objectNotFound?: boolean;
}
interface AuthorizeObject {
	/** The type of object */
	type: string;
	/** The id of the object */
	id: string;
	/** The name of the object */
	name?: string;
	/** Access control information for the object */
	accessControl?: SavedObjectAccessControl;
}
interface AuthorizeObjectWithExistingSpaces extends AuthorizeObject {
	/**
	 * Spaces where the object is known to exist. Usually populated
	 * by document data from the result of an es query.
	 */
	existingNamespaces: string[];
}
interface AuthorizeParams {
	/**
	 * The namespace in which to perform the authorization operation.
	 * If undefined, the current space will be used unless spaces are disabled,
	 * in which case the default space will be used.
	 */
	namespace: string | undefined;
}
interface AuthorizeUpdateObject extends AuthorizeObjectWithExistingSpaces {
	/**
	 * The namespace in which to update this object. Populated by options
	 * passed to the repository's update or bulkUpdate method.
	 */
	objectNamespace?: string;
}
interface AuthorizeUpdateParams extends AuthorizeParams {
	/** The object to authorize */
	object: AuthorizeUpdateObject;
}
interface AuthorizeUpdateSpacesParams extends AuthorizeParams {
	/** The spaces in which to add the objects */
	spacesToAdd: string[];
	/** The spaces from which to remove the objects */
	spacesToRemove: string[];
	/** The objects to authorize */
	objects: AuthorizeObjectWithExistingSpaces[];
}
interface AuthzDisabled {
	enabled: false;
	reason: string;
}
interface AuthzEnabled {
	requiredPrivileges: Privileges;
}
interface BaseArgumentType<T> {
	/** Alternate names for the Function valid for use in the Expression Editor */
	aliases?: string[];
	/**
	 * The flag to mark the function parameter as deprecated.
	 */
	deprecated?: boolean;
	/** Help text for the Argument to be displayed in the Expression Editor */
	help: string;
	/** Default options for the Argument */
	options?: T[];
	/**
	 * Is this Argument required?
	 * @default false
	 */
	required?: boolean;
	/**
	 * If false, the Argument is supplied as a function to be invoked in the
	 * implementation, rather than a value.
	 * @default true
	 */
	resolve?: boolean;
	/**
	 * Turns on strict options checking.
	 * @default false
	 * @deprecated This option is added for backward compatibility and will be removed
	 * as soon as all the functions list all the available options.
	 */
	strict?: boolean;
	/** Names of types that are valid values of the Argument. */
	types?: string[];
	/** The optional default value of the Argument. */
	default?: T | string;
	/**
	 * If true, multiple values may be supplied to the Argument.
	 * @default false
	 */
	multi?: boolean;
}
interface BaseDeprecationDetails {
	/**
	 * The title of the deprecation.
	 * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
	 */
	title: string;
	/**
	 * The description message to be displayed for the deprecation.
	 * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
	 */
	message: string | DeprecationDetailsMessage | Array<string | DeprecationDetailsMessage>;
	/**
	 * levels:
	 * - warning: will not break deployment upon upgrade
	 * - critical: needs to be addressed before upgrade.
	 * - fetch_error: Deprecations service failed to grab the deprecation details for the domain.
	 */
	level: "warning" | "critical" | "fetch_error";
	/**
	 * (optional) Used to identify between different deprecation types.
	 * Example use case: in Upgrade Assistant, we may want to allow the user to sort by
	 * deprecation type or show each type in a separate tab.
	 *
	 * Feel free to add new types if necessary.
	 * Predefined types are necessary to reduce having similar definitions with different keywords
	 * across kibana deprecations.
	 */
	deprecationType?: "config" | "api" | "feature";
	/** (optional) link to the documentation for more details on the deprecation. */
	documentationUrl?: string;
	/** (optional) specify the fix for this deprecation requires a full kibana restart. */
	requireRestart?: boolean;
	/** corrective action needed to fix this deprecation. */
	correctiveActions: {
		/**
		 * (optional) The api to be called to automatically fix the deprecation
		 * Each domain should implement a POST/PUT route for their plugin to
		 * handle their deprecations.
		 */
		api?: {
			/** Kibana route path. Passing a query string is allowed */
			path: string;
			/** Kibana route method: 'POST' or 'PUT'. */
			method: "POST" | "PUT";
			/** Additional details to be passed to the route. */
			body?: {
				[key: string]: any;
			};
			omitContextFromBody?: boolean;
		};
		/**
		 * Specify a list of manual steps users need to follow to
		 * fix the deprecation before upgrade. Required even if an API
		 * corrective action is set in case the API fails.
		 * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
		 */
		manualSteps: string[];
		/**
		 * (optional) The api to be called to mark the deprecation as resolved
		 * This corrective action when called should not resolve the deprecation
		 * instead it helps users track manually deprecated apis
		 * If the API used does resolve the deprecation use `correctiveActions.api`
		 */
		mark_as_resolved_api?: {
			apiTotalCalls: number;
			totalMarkedAsResolved: number;
			timestamp: Date | number | string;
			routePath: string;
			routeMethod: string;
			routeVersion?: string;
		};
	};
}
interface BaseSearchRuntimeMappings {
	[objectPath: string]: api.MappingRuntimeField;
}
interface BaseStateContainer<State extends BaseState> {
	/**
	 * Retrieves current state from the container
	 * @returns current state
	 * @public
	 */
	get: () => State;
	/**
	 * Sets state into container
	 * @param state - new state to set
	 */
	set: (state: State) => void;
	/**
	 * {@link Observable} of state
	 */
	state$: Observable<State>;
}
interface BulkResolveError {
	/** The type of the saved object */
	type: string;
	/** The id of the saved object */
	id: string;
	/** The decorated resolve error */
	error: DecoratedError;
}
interface CapabilitiesSetup {
	/**
	 * Register a {@link CapabilitiesProvider} to be used to provide {@link Capabilities}
	 * when resolving them.
	 *
	 * @example
	 * How to register a plugin's capabilities during setup
	 * ```ts
	 * // my-plugin/server/plugin.ts
	 * public setup(core: CoreSetup, deps: {}) {
	 *    core.capabilities.registerProvider(() => {
	 *      return {
	 *        catalogue: {
	 *          myPlugin: true,
	 *        },
	 *        myPlugin: {
	 *          someFeature: true,
	 *          featureDisabledByDefault: false,
	 *        },
	 *      }
	 *    });
	 * }
	 * ```
	 */
	registerProvider(provider: CapabilitiesProvider): void;
	/**
	 * Register a {@link CapabilitiesSwitcher} to be used to change the default state
	 * of the {@link Capabilities} entries when resolving them.
	 *
	 * A capabilities switcher can only change the state of existing capabilities.
	 * Capabilities added or removed when invoking the switcher will be ignored.
	 *
	 * @example
	 * How to restrict some capabilities
	 * ```ts
	 * // my-plugin/server/plugin.ts
	 * public setup(core: CoreSetup, deps: {}) {
	 *    core.capabilities.registerSwitcher(async (request, capabilities, useDefaultCapabilities) => {
	 *      // useDefaultCapabilities is a special case that switchers typically don't have to concern themselves with.
	 *      // The default capabilities are typically the ones you provide in your CapabilitiesProvider, but this flag
	 *      // gives each switcher an opportunity to change the default capabilities of other plugins' capabilities.
	 *      // For example, you may decide to flip another plugin's capability to false if today is Tuesday,
	 *      // but you wouldn't want to do this when we are requesting the default set of capabilities.
	 *      if (useDefaultCapabilities) {
	 *        return {
	 *          somePlugin: {
	 *            featureEnabledByDefault: true
	 *          }
	 *        }
	 *      }
	 *      if(await myPluginApi.shouldRestrictSomePluginBecauseOf(request)) {
	 *        return {
	 *          somePlugin: {
	 *            featureEnabledByDefault: false // `featureEnabledByDefault` will be disabled. All other capabilities will remain unchanged.
	 *          }
	 *        }
	 *      }
	 *      return {}; // All capabilities will remain unchanged.
	 *    }, {
	 *      // the switcher only toggles capabilities under the 'somePlugin' path
	 *      capabilityPath: 'somePlugin',
	 *    });
	 * }
	 * ```
	 */
	registerSwitcher(switcher: CapabilitiesSwitcher, options: CapabilitiesSwitcherOptions): void;
}
interface CapabilitiesStart {
	/**
	 * Resolve the {@link Capabilities} to be used for given request
	 *
	 * @param request The request to resolve capabilities for
	 * @param options.capabilityPath The path(s) of the capabilities that needs to be retrieved. Use '*' to retrieve all paths.
	 * Used to avoid unnecessarily running switched on parts of the capabilities that won't be used by the API consumer.
	 *
	 * @example
	 * ```ts
	 * const mlCapabilities = (await coreStart.capabilities.resolveCapabilities(request, 'ml')).ml;
	 * ```
	 */
	resolveCapabilities(request: KibanaRequest, options: ResolveCapabilitiesOptions): Promise<Capabilities>;
}
interface CapabilitiesSwitcherOptions {
	/**
	 * The path(s) of capabilities the switcher may alter. The '*' wildcard is supported as a suffix only.
	 *
	 * E.g. capabilityPath: "myPlugin.*" or capabilityPath: "myPlugin.myKey"
	 */
	capabilityPath: string | string[];
}
interface CheckAuthorizationResult<A extends string> {
	/**
	 * The overall status of the authorization check as a string:
	 * 'fully_authorized' | 'partially_authorized' | 'unauthorized'
	 */
	status: "fully_authorized" | "partially_authorized" | "unauthorized";
	/**
	 * The specific authorized privileges: a map of type to record
	 * of action/AuthorizationTypeEntry (spaces/globallyAuthz'd)
	 */
	typeMap: AuthorizationTypeMap<A>;
}
interface ClientBulkOperation {
	index?: Omit<api.BulkIndexOperation, "_index">;
	create?: Omit<api.BulkCreateOperation, "_index">;
	update?: Omit<api.BulkUpdateOperation, "_index">;
	delete?: Omit<api.BulkDeleteOperation, "_index">;
}
interface ClientHelpers<SRM extends BaseSearchRuntimeMappings> {
	/** A helper to get types from your search runtime fields */
	getFieldsFromHit: (response: api.SearchHit) => {
		[key in Exclude<keyof SRM, number | symbol>]: unknown[];
	};
}
interface ClientSearchRequest<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}> extends Omit<api.SearchRequest, "index" | "fields" | "track_total_hits" | "size"> {
	fields?: Array<Exclude<keyof SearchRuntimeMappings, number | symbol>>;
	track_total_hits?: boolean | number;
	size?: number;
}
interface ConfigDeprecationDetails extends BaseDeprecationDetails {
	configPath: string;
	deprecationType: "config";
}
interface ConsoleAppenderConfig {
	type: "console";
	layout: LayoutConfigType;
}
interface CoreAuditService {
	/**
	 * Creates an {@link AuditLogger} scoped to the current request.
	 *
	 * This audit logger logs events with all required user and session info and should be used for
	 * all user-initiated actions.
	 *
	 * @example
	 * ```typescript
	 * const auditLogger = securitySetup.audit.asScoped(request);
	 * auditLogger.log(event);
	 * ```
	 */
	asScoped: (request: KibanaRequest) => AuditLogger;
	/**
	 * {@link AuditLogger} for background tasks only.
	 *
	 * This audit logger logs events without any user or session info and should never be used to log
	 * user-initiated actions.
	 *
	 * @example
	 * ```typescript
	 * securitySetup.audit.withoutRequest.log(event);
	 * ```
	 */
	withoutRequest: AuditLogger;
}
interface CoreAuthenticationService {
	/**
	 * Retrieve the user bound to the provided request, or null if
	 * no user is authenticated.
	 *
	 * @param request The request to retrieve the authenticated user for.
	 */
	getCurrentUser(request: KibanaRequest): AuthenticatedUser | null;
	apiKeys: APIKeys;
}
interface CoreConfigUsageData {
	elasticsearch: {
		sniffOnStart: boolean;
		sniffIntervalMs?: number;
		sniffOnConnectionFault: boolean;
		numberOfHostsConfigured: number;
		requestHeadersWhitelistConfigured: boolean;
		customHeadersConfigured: boolean;
		shardTimeoutMs: number;
		requestTimeoutMs: number;
		logQueries: boolean;
		ssl: {
			verificationMode: "none" | "certificate" | "full";
			certificateAuthoritiesConfigured: boolean;
			certificateConfigured: boolean;
			keyConfigured: boolean;
			keystoreConfigured: boolean;
			truststoreConfigured: boolean;
			alwaysPresentCertificate: boolean;
		};
		apiVersion: string;
		healthCheckDelayMs: number;
		principal: "elastic_user" | "kibana_user" | "kibana_system_user" | "other_user" | "kibana_service_account" | "unknown";
	};
	http: {
		basePathConfigured: boolean;
		maxPayloadInBytes: number;
		rewriteBasePath: boolean;
		keepaliveTimeout: number;
		socketTimeout: number;
		protocol: "http1" | "http2";
		compression: {
			enabled: boolean;
			referrerWhitelistConfigured: boolean;
		};
		xsrf: {
			disableProtection: boolean;
			allowlistConfigured: boolean;
		};
		requestId: {
			allowFromAnyIp: boolean;
			ipAllowlistConfigured: boolean;
		};
		ssl: {
			certificateAuthoritiesConfigured: boolean;
			certificateConfigured: boolean;
			cipherSuites: string[];
			keyConfigured: boolean;
			keystoreConfigured: boolean;
			truststoreConfigured: boolean;
			redirectHttpFromPortConfigured: boolean;
			supportedProtocols: string[];
			clientAuthentication: "none" | "optional" | "required";
		};
		securityResponseHeaders: {
			strictTransportSecurity: string;
			xContentTypeOptions: string;
			referrerPolicy: string;
			permissionsPolicyConfigured: boolean;
			disableEmbedding: boolean;
			crossOriginOpenerPolicy: string;
		};
	};
	logging: {
		appendersTypesUsed: string[];
		loggersConfiguredCount: number;
	};
	savedObjects: {
		customIndex: boolean;
		maxImportPayloadBytes: number;
		maxImportExportSize: number;
	};
	deprecatedKeys: {
		set: string[];
		unset: string[];
	};
}
interface CoreDeprecatedApiUsageStats {
	apiId: string;
	totalMarkedAsResolved: number;
	markedAsResolvedLastCalledAt: string;
	apiTotalCalls: number;
	apiLastCalledAt: string;
}
interface CoreDiServiceSetup {
	/**
	 * Get the plugin-scoped container
	 */
	getContainer(): Container;
}
interface CoreDiServiceStart extends CoreDiServiceSetup {
	/**
	 * Fork the current plugin scope
	 */
	fork(): Container;
}
interface CoreEnvironmentUsageData {
	memory: {
		arrayBuffersBytes: number;
		residentSetSizeBytes: number;
		externalBytes: number;
		heapTotalBytes: number;
		heapUsedBytes: number;
		/** V8 heap size limit */
		heapSizeLimit: number;
	};
}
interface CoreFipsService {
	/**
	 * Check if Kibana is configured to run in FIPS mode
	 */
	isEnabled(): boolean;
}
interface CoreIncrementCounterParams {
	/** The name of the counter **/
	counterName: string;
	/** The counter type ("count" by default) **/
	counterType?: string;
	/** Increment the counter by this number (1 if not specified) **/
	incrementBy?: number;
}
interface CoreRequestHandlerContext {
	/**
	 * {@link SavedObjectsRequestHandlerContext}
	 */
	savedObjects: SavedObjectsRequestHandlerContext;
	/**
	 * {@link ElasticsearchRequestHandlerContext}
	 */
	elasticsearch: ElasticsearchRequestHandlerContext;
	/**
	 * {@link FeatureFlagsRequestHandlerContext}
	 */
	featureFlags: FeatureFlagsRequestHandlerContext;
	/**
	 * {@link UiSettingsRequestHandlerContext}
	 */
	uiSettings: UiSettingsRequestHandlerContext;
	/**
	 * {@link DeprecationsRequestHandlerContext}
	 */
	deprecations: DeprecationsRequestHandlerContext;
	/**
	 * {@link SecurityRequestHandlerContext}
	 */
	security: SecurityRequestHandlerContext;
	/**
	 * {@link UserProfileRequestHandlerContext}
	 */
	userProfile: UserProfileRequestHandlerContext;
}
interface CoreSecurityDelegateContract {
	authc: AuthenticationServiceContract;
	audit: AuditServiceContract;
}
interface CoreServicesUsageData {
	savedObjects: {
		indices: {
			alias: string;
			docsCount: number;
			docsDeleted: number;
			storeSizeBytes: number;
			primaryStoreSizeBytes: number;
			savedObjectsDocsCount: number;
		}[];
		legacyUrlAliases: {
			activeCount: number;
			inactiveCount: number;
			disabledCount: number;
			totalCount: number;
		};
	};
}
interface CoreSetup<TPluginsStart extends Record<string, any> = {}, TStart = unknown> {
	/** {@link AnalyticsServiceSetup} */
	analytics: AnalyticsServiceSetup;
	/** {@link CapabilitiesSetup} */
	capabilities: CapabilitiesSetup;
	/** {@link CustomBrandingSetup} */
	customBranding: CustomBrandingSetup;
	/** {@link DocLinksServiceSetup} */
	docLinks: DocLinksServiceSetup;
	/** {@link ElasticsearchServiceSetup} */
	elasticsearch: ElasticsearchServiceSetup;
	/** {@link ExecutionContextSetup} */
	executionContext: ExecutionContextSetup;
	/** {@link FeatureFlagsSetup} */
	featureFlags: FeatureFlagsSetup;
	/** {@link HttpServiceSetup} */
	http: HttpServiceSetup<RequestHandlerContext> & {
		/** {@link HttpResources} */
		resources: HttpResources;
	};
	/** {@link I18nServiceSetup} */
	i18n: I18nServiceSetup;
	/** {@link LoggingServiceSetup} */
	logging: LoggingServiceSetup;
	/** {@link MetricsServiceSetup} */
	metrics: MetricsServiceSetup;
	/** {@link SavedObjectsServiceSetup} */
	savedObjects: SavedObjectsServiceSetup;
	/** {@link StatusServiceSetup} */
	status: StatusServiceSetup;
	/** {@link UiSettingsServiceSetup} */
	uiSettings: UiSettingsServiceSetup;
	/** {@link UserSettingsServiceSetup} */
	userSettings: UserSettingsServiceSetup;
	/** {@link DeprecationsServiceSetup} */
	deprecations: DeprecationsServiceSetup;
	/** {@link StartServicesAccessor} */
	getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
	/** {@link RequestHandlerContextFactory} */
	createRequestHandlerContext: RequestHandlerContextFactory;
	/** @internal {@link CoreUsageDataSetup} */
	coreUsageData: CoreUsageDataSetup;
	/** {@link PluginsServiceSetup} */
	plugins: PluginsServiceSetup;
	/** {@link PricingServiceSetup} */
	pricing: PricingServiceSetup;
	/** {@link SecurityServiceSetup} */
	security: SecurityServiceSetup;
	/** {@link UserProfileServiceSetup} */
	userProfile: UserProfileServiceSetup;
	/** {@link CoreDiServiceSetup} */
	injection: CoreDiServiceSetup;
	/** {@link DataStreamSetup} */
	dataStreams: DataStreamsSetup;
}
interface CoreStart {
	/** {@link AnalyticsServiceStart} */
	analytics: AnalyticsServiceStart;
	/** {@link CapabilitiesStart} */
	capabilities: CapabilitiesStart;
	/** {@link CustomBrandingStart} */
	customBranding: CustomBrandingStart;
	/** {@link DocLinksServiceStart} */
	docLinks: DocLinksServiceStart;
	/** {@link ElasticsearchServiceStart} */
	elasticsearch: ElasticsearchServiceStart;
	/** {@link ExecutionContextStart} */
	executionContext: ExecutionContextStart;
	/** {@link FeatureFlagsStart} */
	featureFlags: FeatureFlagsStart;
	/** {@link HttpServiceStart} */
	http: HttpServiceStart;
	/** {@link MetricsServiceStart} */
	metrics: MetricsServiceStart;
	/** {@link SavedObjectsServiceStart} */
	savedObjects: SavedObjectsServiceStart;
	/** {@link UiSettingsServiceStart} */
	uiSettings: UiSettingsServiceStart;
	/** @internal {@link CoreUsageDataStart} */
	coreUsageData: CoreUsageDataStart;
	/** {@link PluginsServiceStart} */
	plugins: PluginsServiceStart;
	/** {@link PricingServiceStart} */
	pricing: PricingServiceStart;
	/** {@link SecurityServiceStart} */
	security: SecurityServiceStart;
	/** {@link UserProfileServiceStart} */
	userProfile: UserProfileServiceStart;
	/** {@link CoreDiServiceStart} */
	injection: CoreDiServiceStart;
	/** {@link DataStreamsStart} */
	dataStreams: DataStreamsStart;
}
interface CoreStatusBase {
	elasticsearch: ServiceStatus;
	savedObjects: ServiceStatus;
}
interface CoreStatusWithHttp extends CoreStatusBase {
	http: ServiceStatus;
}
interface CoreUsageCounter {
	/** @internal {@link CoreIncrementUsageCounter} **/
	incrementCounter: CoreIncrementUsageCounter;
}
interface CoreUsageData extends CoreUsageStats {
	config: CoreConfigUsageData;
	services: CoreServicesUsageData;
	environment: CoreEnvironmentUsageData;
}
interface CoreUsageDataSetup {
	/**
	 * API for a usage tracker plugin to inject the {@link CoreUsageCounter} to use
	 * when tracking events.
	 */
	registerUsageCounter: (usageCounter: CoreUsageCounter) => void;
	registerDeprecatedUsageFetch: (fetchFn: DeprecatedApiUsageFetcher) => void;
}
interface CoreUsageDataStart {
	/**
	 * Internal API for getting Core's usage data payload.
	 *
	 * @note This API should never be used to drive application logic and is only
	 * intended for telemetry purposes.
	 *
	 * @internal
	 * */
	getCoreUsageData(): Promise<CoreUsageData>;
	getConfigsUsageData(): Promise<ConfigUsageData>;
}
interface CoreUsageStats {
	"apiCalls.savedObjectsBulkCreate.total"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.default.total"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.custom.total"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkGet.total"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.default.total"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.custom.total"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkResolve.total"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.default.total"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.custom.total"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkUpdate.total"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.default.total"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.custom.total"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkDelete.total"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.default.total"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.custom.total"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsBulkDelete.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsCreate.total"?: number;
	"apiCalls.savedObjectsCreate.namespace.default.total"?: number;
	"apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsCreate.namespace.custom.total"?: number;
	"apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsDelete.total"?: number;
	"apiCalls.savedObjectsDelete.namespace.default.total"?: number;
	"apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsDelete.namespace.custom.total"?: number;
	"apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsFind.total"?: number;
	"apiCalls.savedObjectsFind.namespace.default.total"?: number;
	"apiCalls.savedObjectsFind.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsFind.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsFind.namespace.custom.total"?: number;
	"apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsGet.total"?: number;
	"apiCalls.savedObjectsGet.namespace.default.total"?: number;
	"apiCalls.savedObjectsGet.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsGet.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsGet.namespace.custom.total"?: number;
	"apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsResolve.total"?: number;
	"apiCalls.savedObjectsResolve.namespace.default.total"?: number;
	"apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsResolve.namespace.custom.total"?: number;
	"apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsUpdate.total"?: number;
	"apiCalls.savedObjectsUpdate.namespace.default.total"?: number;
	"apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsUpdate.namespace.custom.total"?: number;
	"apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsImport.total"?: number;
	"apiCalls.savedObjectsImport.namespace.default.total"?: number;
	"apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsImport.namespace.custom.total"?: number;
	"apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsImport.createNewCopiesEnabled.yes"?: number;
	"apiCalls.savedObjectsImport.createNewCopiesEnabled.no"?: number;
	"apiCalls.savedObjectsImport.compatibilityModeEnabled.yes"?: number;
	"apiCalls.savedObjectsImport.compatibilityModeEnabled.no"?: number;
	"apiCalls.savedObjectsImport.overwriteEnabled.yes"?: number;
	"apiCalls.savedObjectsImport.overwriteEnabled.no"?: number;
	"apiCalls.savedObjectsResolveImportErrors.total"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.default.total"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.custom.total"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.yes"?: number;
	"apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.no"?: number;
	"apiCalls.savedObjectsExport.total"?: number;
	"apiCalls.savedObjectsExport.namespace.default.total"?: number;
	"apiCalls.savedObjectsExport.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsExport.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsExport.namespace.custom.total"?: number;
	"apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.savedObjectsExport.allTypesSelected.yes"?: number;
	"apiCalls.savedObjectsExport.allTypesSelected.no"?: number;
	"apiCalls.legacyDashboardExport.total"?: number;
	"apiCalls.legacyDashboardExport.namespace.default.total"?: number;
	"apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.legacyDashboardExport.namespace.custom.total"?: number;
	"apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.no"?: number;
	"apiCalls.legacyDashboardImport.total"?: number;
	"apiCalls.legacyDashboardImport.namespace.default.total"?: number;
	"apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.yes"?: number;
	"apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.no"?: number;
	"apiCalls.legacyDashboardImport.namespace.custom.total"?: number;
	"apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.yes"?: number;
	"apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.no"?: number;
	"savedObjectsRepository.resolvedOutcome.exactMatch"?: number;
	"savedObjectsRepository.resolvedOutcome.aliasMatch"?: number;
	"savedObjectsRepository.resolvedOutcome.conflict"?: number;
	"savedObjectsRepository.resolvedOutcome.notFound"?: number;
	"savedObjectsRepository.resolvedOutcome.total"?: number;
	"deprecated_api_calls_resolved.total"?: number;
	"deprecated_api_calls.total"?: number;
}
interface CreateCrossClusterAPIKeyParams {
	type: "cross_cluster";
	expiration?: string;
	name: string;
	metadata?: {
		[key: string]: any;
	};
	access: {
		search?: Array<{
			names: string[];
			query?: unknown;
			field_security?: unknown;
			allow_restricted_indices?: boolean;
		}>;
		replication?: Array<{
			names: string[];
		}>;
	};
}
interface CreateRestAPIKeyParams {
	type?: "rest";
	expiration?: string;
	name: string;
	role_descriptors: Record<string, {
		[key: string]: any;
	}>;
	metadata?: {
		[key: string]: any;
	};
}
interface CreateRestAPIKeyWithKibanaPrivilegesParams {
	type?: "rest";
	expiration?: string;
	name: string;
	metadata?: {
		[key: string]: any;
	};
	kibana_role_descriptors: Record<string, {
		elasticsearch: ElasticsearchPrivilegesType & {
			[key: string]: unknown;
		};
		kibana: KibanaPrivilegesType;
	}>;
}
interface CustomBranding {
	/**
	 * Custom replacement for the Elastic logo in the top lef *
	 * */
	logo?: string;
	/**
	 * Custom replacement for favicon in SVG format
	 */
	faviconSVG?: string;
	/**
	 * Custom page title
	 */
	pageTitle?: string;
	/**
	 * Custom replacement for Elastic Mark
	 * @link src/core/packages/chrome/browser-internal/src/ui/header/elastic_mark.tsx
	 */
	customizedLogo?: string;
	/**
	 * Custom replacement for favicon in PNG format
	 */
	faviconPNG?: string;
}
interface CustomBrandingSetup {
	register: (fetchFn: CustomBrandingFetchFn) => void;
	getBrandingFor: (request: KibanaRequest, options: {
		unauthenticated?: boolean;
	}) => Promise<CustomBranding>;
}
interface CustomBrandingStart {
}
interface CustomHttpResponseOptions<T extends HttpResponsePayload | ResponseError> {
	/** HTTP message to send to the client */
	body?: T;
	/** HTTP Headers with additional information about response */
	headers?: ResponseHeaders;
	/** Bypass the default error formatting */
	bypassErrorFormat?: boolean;
	statusCode: number;
}
interface DataStreamDefinition<Mappings extends MappingsDefinition, FullMappings extends GetFieldsOf<Mappings> = GetFieldsOf<Mappings>, SearchRuntimeMappings extends BaseSearchRuntimeMappings = never> {
	/**
	 * @remark Once released this should never change.
	 */
	name: string;
	searchRuntimeMappings?: SearchRuntimeMappings;
	/**
	 * Is this a hidden data stream?
	 * @default true
	 */
	hidden?: boolean;
	/**
	 * @remark Must be **incremented** in order to release a new version of the template definition.
	 * @remark Must be greater than 0
	 */
	version: number;
	/**
	 * The index template definition for the data stream.
	 *
	 * This template definition corresponds to types from ES:
	 *  - api.IndicesPutIndexTemplateRequest
	 *  - api.IndicesIndexTemplate
	 *  - api.IndicesIndexTemplateSummary
	 */
	template: Pick<api.IndicesIndexTemplateSummary, "aliases"> & {
		/** @default 100 */
		priority?: number;
		/**
		 * Auto-populated with the following properties:
		 * managed: true;                  // present as a managed index template/data stream
		 * userAgent: string;              // an indication of what code created the resources
		 * version: string;                // the deployed version of the template definition
		 * previousVersions: string[];     // previous data stream definitions
		 */
		_meta?: {
			[key: string]: unknown;
		};
		mappings?: EnsureSubsetOf<Mappings, FullMappings> extends true ? Mappings : never;
		/**
		 * @remark "hidden" defaults to true for the data stream and the backing indices
		 */
		settings?: api.IndicesIndexSettings;
		/**
		 * @remark Stick to defining and sharing mappings as plain JavaScript objects.
		 * @remark Use component templates if you would like to allow end users to define mappings. You will have to ensure
		 *         that updated mappings are applied to existing indices.
		 */
		composedOf?: string[];
	};
}
interface DataStreamsSetup {
	/**
	 * Register your data stream definition for setup.
	 *
	 * @remark This will eagerly create and update the mappings of the data stream, while lazily creating the data stream itself.
	 *
	 * @public
	 */
	registerDataStream<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings>(dataStreamDefinition: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>): void;
}
interface DataStreamsStart {
	/**
	 * Initializes the data stream client if it is not already initialized.
	 * returns the client which interfaces with the data stream.
	 *
	 * @remark This function initializes the data stream if it is not already initialized. Call it as lazily as possible, as near the ES operations as possible.
	 *
	 * @public
	 */
	initializeClient<S extends MappingsDefinition, FullDocumentType extends GetFieldsOf<S> = GetFieldsOf<S>, SRM extends BaseSearchRuntimeMappings = never>(dataStreamName: string): Promise<IDataStreamClient<S, FullDocumentType, SRM>>;
}
interface Datatable {
	type: typeof name$1;
	columns: DatatableColumn[];
	meta?: DatatableMeta;
	rows: DatatableRow[];
	warning?: string;
}
interface DatatableColumn {
	id: string;
	name: string;
	meta: DatatableColumnMeta;
	isNull?: boolean;
	variable?: string;
}
interface DatatableColumnMeta {
	/**
	 * The Kibana normalized type of the column
	 */
	type: DatatableColumnType;
	/**
	 * The original type of the column from ES
	 */
	esType?: string;
	/**
	 * field this column is based on
	 */
	field?: string;
	/**
	 * index/table this column is based on
	 */
	index?: string;
	/**
	 * i18nized names the domain this column represents
	 */
	dimensionName?: string;
	/**
	 * types of dimension this column represents
	 */
	dimensionType?: string;
	/**
	 * serialized field format
	 */
	params?: SerializedFieldFormat;
	/**
	 * source function that produced this column
	 */
	source?: string;
	/**
	 * any extra parameters for the source that produced this column
	 */
	sourceParams?: SerializableRecord;
}
interface DatatableMeta {
	/**
	 * Statistics about the `Datatable` source.
	 */
	statistics?: DatatableMetaStatistics;
	/**
	 * The `Datatable` type (e.g. `essql`, `eql`, `esdsl`, etc.).
	 */
	type?: string;
	/**
	 * The `Datatable` data source.
	 */
	source?: string;
	[key: string]: unknown;
}
interface DatatableMetaStatistics {
	/**
	 * Total hits number returned for the request generated the `Datatable`.
	 */
	totalCount?: number;
}
interface DecoratedError extends Boom.Boom {
	/** the 'SavedObjectsClientErrorCode' symbol */
	[code]?: string;
}
interface DeepPartialArray<T> extends Array<DeepPartial<T>> {
}
interface DefaultInspectorAdapters {
	requests: RequestAdapter;
	tables: TablesAdapter;
	expression: ExpressionsInspectorAdapter;
}
interface DeprecateApiDeprecationType {
	/**
	 * deprecate deprecation reason denotes the API is deprecated but it doesnt have a replacement
	 * or a clear version that it will be removed in. This is useful to alert users that the API is deprecated
	 * to allow them as much time as possible to work around this fact before the deprecation
	 * turns into a `remove` or `migrate` or `bump` type.
	 *
	 * Recommended to pair this with `severity: 'warning'` to avoid blocking the upgrades for this type.
	 */
	type: "deprecate";
}
interface DeprecationDetailsMessage {
	type: "markdown" | "text";
	content: string;
}
interface DeprecationSettings {
	/** Deprecation message */
	message: string;
	/** Key to documentation links */
	docLinksKey: string;
}
interface DeprecationsClient {
	/**
	 * Fetch all Kibana deprecations.
	 */
	getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
}
interface DeprecationsRequestHandlerContext {
	/**
	 * {@link DeprecationsClient | Deprecations client} exposed in the request handler context.
	 */
	client: DeprecationsClient;
}
interface DeprecationsServiceSetup {
	/**
	 * Registers deprecation messages or notices for a specific feature or functionality
	 * within the application. This allows developers to flag certain behaviors or APIs
	 * as deprecated, providing guidance and warnings for future deprecation plans.
	 *
	 * @param {RegisterDeprecationsConfig} deprecationContext - The configuration object containing
	 * information about the deprecated features, including messages, corrective actions,
	 * and any relevant metadata to inform users or developers about the deprecation.
	 */
	registerDeprecations: (deprecationContext: RegisterDeprecationsConfig) => void;
}
interface DocLinks {
	readonly settings: string;
	readonly aiAssistantSettings: string;
	readonly elasticStackGetStarted: string;
	readonly apiReference: string;
	readonly serverlessReleaseNotes: string;
	readonly upgrade: {
		readonly upgradingStackOnPrem: string;
		readonly upgradingStackOnCloud: string;
	};
	readonly apm: {
		readonly kibanaSettings: string;
		readonly supportedServiceMaps: string;
		readonly customLinks: string;
		readonly droppedTransactionSpans: string;
		readonly upgrading: string;
		readonly metaData: string;
		readonly overview: string;
		readonly tailSamplingPolicies: string;
		readonly elasticAgent: string;
		readonly storageExplorer: string;
		readonly spanCompression: string;
		readonly transactionSampling: string;
		readonly indexLifecycleManagement: string;
	};
	readonly canvas: {
		readonly guide: string;
	};
	readonly cloud: {
		readonly beatsAndLogstashConfiguration: string;
		readonly elasticsearchBillingManagingCosts: string;
		readonly indexManagement: string;
		readonly cloudConnect: string;
		readonly connectToAutoops: string;
	};
	readonly console: {
		readonly guide: string;
	};
	readonly dashboard: {
		readonly guide: string;
		readonly drilldowns: string;
		readonly drilldownsTriggerPicker: string;
		readonly urlDrilldownTemplateSyntax: string;
		readonly urlDrilldownVariables: string;
	};
	readonly discover: Record<string, string>;
	readonly filebeat: {
		readonly base: string;
		readonly installation: string;
		readonly configuration: string;
		readonly elasticsearchOutput: string;
		readonly elasticsearchModule: string;
		readonly startup: string;
		readonly exportedFields: string;
		readonly suricataModule: string;
		readonly zeekModule: string;
	};
	readonly auditbeat: {
		readonly base: string;
		readonly auditdModule: string;
		readonly systemModule: string;
	};
	readonly searchHomepage: {
		readonly visitSearchLabs: string;
		readonly notebooksExamples: string;
		readonly customerEngineerRequestForm: string;
		readonly elasticCommunity: string;
		readonly elasticCloud: string;
	};
	readonly searchGettingStarted: {
		readonly visitSearchLabs: string;
		readonly notebooksExamples: string;
		readonly elasticTraining: string;
	};
	readonly metricbeat: {
		readonly base: string;
		readonly configure: string;
		readonly httpEndpoint: string;
		readonly install: string;
		readonly start: string;
	};
	readonly enterpriseSearch: {
		readonly aiSearchDoc: string;
		readonly aiSearchHelp: string;
		readonly apiKeys: string;
		readonly behavioralAnalytics: string;
		readonly behavioralAnalyticsCORS: string;
		readonly behavioralAnalyticsEvents: string;
		readonly buildConnector: string;
		readonly bulkApi: string;
		readonly configuration: string;
		readonly connectors: string;
		readonly connectorsClientDeploy: string;
		readonly connectorsMappings: string;
		readonly connectorsAzureBlobStorage: string;
		readonly connectorsBox: string;
		readonly connectorsClients: string;
		readonly connectorsConfluence: string;
		readonly connectorsContentExtraction: string;
		readonly connectorsDropbox: string;
		readonly connectorsGithub: string;
		readonly connectorsGitlab: string;
		readonly connectorsGoogleCloudStorage: string;
		readonly connectorsGoogleDrive: string;
		readonly connectorsGmail: string;
		readonly connectorsJira: string;
		readonly connectorsMicrosoftSQL: string;
		readonly connectorsMongoDB: string;
		readonly connectorsMySQL: string;
		readonly connectorsNative: string;
		readonly connectorsNetworkDrive: string;
		readonly connectorsNotion: string;
		readonly connectorsOneDrive: string;
		readonly connectorsOracle: string;
		readonly connectorsOutlook: string;
		readonly connectorsPostgreSQL: string;
		readonly connectorsRedis: string;
		readonly connectorsS3: string;
		readonly connectorsSalesforce: string;
		readonly connectorsServiceNow: string;
		readonly connectorsSharepoint: string;
		readonly connectorsSharepointOnline: string;
		readonly connectorsTeams: string;
		readonly connectorsSlack: string;
		readonly connectorsZoom: string;
		readonly crawlerExtractionRules: string;
		readonly crawlerManaging: string;
		readonly crawlerOverview: string;
		readonly deployTrainedModels: string;
		readonly documentLevelSecurity: string;
		readonly e5Model: string;
		readonly elasticInferenceService: string;
		readonly elasticInferenceServicePricing: string;
		readonly elser: string;
		readonly engines: string;
		readonly indexApi: string;
		readonly inferenceApiCreate: string;
		readonly inferenceApisConfigureChunking: string;
		readonly ingestionApis: string;
		readonly ingestPipelines: string;
		readonly knnSearch: string;
		readonly knnSearchCombine: string;
		readonly languageAnalyzers: string;
		readonly languageClients: string;
		readonly licenseManagement: string;
		readonly machineLearningStart: string;
		readonly mailService: string;
		readonly mlDocumentEnrichment: string;
		readonly searchApplicationsTemplates: string;
		readonly searchApplicationsSearchApi: string;
		readonly searchApplications: string;
		readonly searchApplicationsSearch: string;
		readonly searchLabs: string;
		readonly searchLabsRepo: string;
		readonly semanticSearch: string;
		readonly searchTemplates: string;
		readonly semanticTextField: string;
		readonly start: string;
		readonly supportedNlpModels: string;
		readonly syncRules: string;
		readonly syncRulesAdvanced: string;
		readonly trainedModels: string;
		readonly textEmbedding: string;
		readonly troubleshootSetup: string;
		readonly usersAccess: string;
		readonly upgrade9x: string;
	};
	readonly heartbeat: {
		readonly base: string;
		readonly monitorTags: string;
	};
	readonly libbeat: {
		readonly getStarted: string;
	};
	readonly logstash: {
		readonly base: string;
		readonly inputElasticAgent: string;
	};
	readonly winlogbeat: {
		readonly base: string;
	};
	readonly aggs: {
		readonly composite: string;
		readonly composite_missing_bucket: string;
		readonly date_histogram: string;
		readonly date_range: string;
		readonly date_format_pattern: string;
		readonly filter: string;
		readonly filters: string;
		readonly geohash_grid: string;
		readonly histogram: string;
		readonly ip_range: string;
		readonly range: string;
		readonly significant_terms: string;
		readonly terms: string;
		readonly terms_doc_count_error: string;
		readonly rare_terms: string;
		readonly avg: string;
		readonly avg_bucket: string;
		readonly max_bucket: string;
		readonly min_bucket: string;
		readonly sum_bucket: string;
		readonly cardinality: string;
		readonly count: string;
		readonly cumulative_sum: string;
		readonly derivative: string;
		readonly geo_bounds: string;
		readonly geo_centroid: string;
		readonly max: string;
		readonly median: string;
		readonly min: string;
		readonly moving_avg: string;
		readonly percentile_ranks: string;
		readonly serial_diff: string;
		readonly std_dev: string;
		readonly sum: string;
		readonly top_hits: string;
		readonly change_point: string;
	};
	readonly runtimeFields: {
		readonly overview: string;
		readonly mapping: string;
	};
	readonly scriptedFields: {
		readonly scriptFields: string;
		readonly scriptAggs: string;
		readonly painless: string;
		readonly painlessApi: string;
		readonly painlessLangSpec: string;
		readonly painlessSyntax: string;
		readonly painlessWalkthrough: string;
		readonly luceneExpressions: string;
	};
	readonly search: {
		readonly sessions: string;
		readonly sessionLimits: string;
	};
	readonly indexPatterns: {
		readonly introduction: string;
		readonly fieldFormattersNumber: string;
		readonly fieldFormattersString: string;
		readonly runtimeFields: string;
		readonly migrateOffScriptedFields: string;
	};
	readonly addData: string;
	readonly kibana: {
		readonly askElastic: string;
		readonly createGithubIssue: string;
		readonly feedback: string;
		readonly guide: string;
		readonly autocompleteSuggestions: string;
		readonly secureSavedObject: string;
		readonly xpackSecurity: string;
		readonly upgradeNotes: string;
	};
	readonly upgradeAssistant: {
		readonly overview: string;
		readonly batchReindex: string;
		readonly indexBlocks: string;
		readonly remoteReindex: string;
		readonly unfreezeApi: string;
		readonly reindexWithPipeline: string;
		readonly logsDatastream: string;
		readonly usingLogsDbIndexModeWithESSecurity: string;
		readonly dataStreamReindex: string;
	};
	readonly rollupJobs: string;
	readonly elasticsearch: Record<string, string>;
	readonly siem: {
		readonly privileges: string;
		readonly guide: string;
		readonly gettingStarted: string;
		readonly ml: string;
		readonly ruleChangeLog: string;
		readonly detectionsReq: string;
		readonly networkMap: string;
		readonly troubleshootGaps: string;
		readonly gapsTable: string;
		readonly ruleApiOverview: string;
		readonly configureAlertSuppression: string;
		readonly ingestDataToSecurity: string;
		readonly automaticImport: string;
	};
	readonly server: {
		readonly protocol: string;
		readonly publicBaseUrl: string;
		readonly troubleshootServerNotReady: string;
	};
	readonly logging: {
		readonly enableDeprecationHttpDebugLogs: string;
	};
	readonly securitySolution: {
		readonly aiAssistant: {
			home: string;
			knowledgeBaseHome: string;
			knowledgeBaseIndexEntries: string;
		};
		readonly cloudSecurityPosture: string;
		readonly installElasticDefend: string;
		readonly artifactControl: string;
		readonly avcResults: string;
		readonly bidirectionalIntegrations: string;
		readonly thirdPartyLlmProviders: string;
		readonly trustedApps: string;
		readonly trustedDevices: string;
		readonly elasticAiFeatures: string;
		readonly eventFilters: string;
		readonly eventMerging: string;
		readonly blocklist: string;
		readonly endpointArtifacts: string;
		readonly policyResponseTroubleshooting: {
			full_disk_access: string;
			macos_system_ext: string;
			linux_deadlock: string;
		};
		readonly packageActionTroubleshooting: {
			es_connection: string;
		};
		readonly threatIntelInt: string;
		readonly responseActions: string;
		readonly configureEndpointIntegrationPolicy: string;
		readonly exceptions: {
			value_lists: string;
		};
		readonly privileges: string;
		readonly manageDetectionRules: string;
		readonly createDetectionRules: string;
		readonly updatePrebuiltDetectionRules: string;
		readonly prebuiltRuleCustomizationPromoBlog: string;
		readonly resolvePrebuiltRuleConflicts: string;
		readonly createEsqlRuleType: string;
		readonly ruleUiAdvancedParams: string;
		readonly entityAnalytics: {
			readonly riskScorePrerequisites: string;
			readonly entityRiskScoring: string;
			readonly assetCriticality: string;
			readonly privilegedUserMonitoring: string;
			readonly mlAnomalyDetection: string;
		};
		readonly detectionEngineOverview: string;
		readonly signalsMigrationApi: string;
		readonly siemMigrations: string;
		readonly llmPerformanceMatrix: string;
	};
	readonly query: {
		readonly eql: string;
		readonly kueryQuerySyntax: string;
		readonly luceneQuery: string;
		readonly luceneQuerySyntax: string;
		readonly percolate: string;
		readonly queryDsl: string;
		readonly queryESQL: string;
		readonly queryESQLExamples: string;
		readonly queryESQLMultiValueControls: string;
	};
	readonly date: {
		readonly dateMath: string;
		readonly dateMathIndexNames: string;
	};
	readonly management: Record<string, string>;
	readonly ml: Record<string, string>;
	readonly transforms: Record<string, string>;
	readonly visualize: Record<string, string>;
	readonly apis: Readonly<{
		bulkIndexAlias: string;
		indexStats: string;
		byteSizeUnits: string;
		createAutoFollowPattern: string;
		createFollower: string;
		createIndex: string;
		createSnapshotLifecyclePolicy: string;
		createRoleMapping: string;
		createRoleMappingTemplates: string;
		createRollupJobsRequest: string;
		createApiKey: string;
		createApiKeyMetadata: string;
		createApiKeyRoleDescriptors: string;
		createCrossClusterApiKey: string;
		createPipeline: string;
		createTransformRequest: string;
		cronExpressions: string;
		executeWatchActionModes: string;
		indexExists: string;
		inferTrainedModel: string;
		multiSearch: string;
		openIndex: string;
		putComponentTemplate: string;
		painlessExecute: string;
		painlessExecuteAPIContexts: string;
		putComponentTemplateMetadata: string;
		putSnapshotLifecyclePolicy: string;
		putIndexTemplateV1: string;
		putWatch: string;
		restApis: string;
		searchPreference: string;
		securityApis: string;
		simulatePipeline: string;
		tasks: string;
		timeUnits: string;
		updateTransform: string;
	}>;
	readonly observability: Readonly<{
		guide: string;
		infrastructureThreshold: string;
		logsThreshold: string;
		metricsThreshold: string;
		customThreshold: string;
		monitorStatus: string;
		monitorUptime: string;
		tlsCertificate: string;
		uptimeDurationAnomaly: string;
		monitorLogs: string;
		logsStreams: string;
		wiredStreams: string;
		analyzeMetrics: string;
		monitorUptimeSynthetics: string;
		userExperience: string;
		createAlerts: string;
		syntheticsAlerting: string;
		syntheticsCommandReference: string;
		syntheticsProjectMonitors: string;
		syntheticsMigrateFromIntegration: string;
		slo: string;
		sloBurnRateRule: string;
		aiAssistant: string;
		elasticManagedLlm: string;
		elasticManagedLlmUsageCost: string;
		elasticServerlessSearchManagedLlmUsageCost: string;
	}>;
	readonly alerting: Readonly<{
		authorization: string;
		guide: string;
		actionTypes: string;
		apmRulesErrorCount: string;
		apmRulesTransactionDuration: string;
		apmRulesTransactionError: string;
		apmRulesAnomaly: string;
		emailAction: string;
		emailActionConfig: string;
		emailExchangeClientSecretConfig: string;
		emailExchangeClientIdConfig: string;
		generalSettings: string;
		indexAction: string;
		esQuery: string;
		indexThreshold: string;
		maintenanceWindows: string;
		pagerDutyAction: string;
		preconfiguredConnectors: string;
		preconfiguredAlertHistoryConnector: string;
		serviceNowAction: string;
		serviceNowSIRAction: string;
		setupPrerequisites: string;
		slackAction: string;
		slackApiAction: string;
		teamsAction: string;
		connectors: string;
	}>;
	readonly taskManager: Readonly<{
		healthMonitoring: string;
	}>;
	readonly maps: Readonly<{
		connectToEms: string;
		guide: string;
		importGeospatialPrivileges: string;
		gdalTutorial: string;
		termJoinsExample: string;
	}>;
	readonly monitoring: Record<string, string>;
	readonly reporting: Readonly<{
		cloudMinimumRequirements: string;
		browserSystemDependencies: string;
		browserSandboxDependencies: string;
	}>;
	readonly security: Readonly<{
		apiKeyServiceSettings: string;
		clusterPrivileges: string;
		definingRoles: string;
		elasticsearchSettings: string;
		elasticsearchEnableSecurity: string;
		elasticsearchEnableApiKeys: string;
		indicesPrivileges: string;
		kibanaTLS: string;
		kibanaPrivileges: string;
		mappingRoles: string;
		mappingRolesFieldRules: string;
		roles: string;
		runAsPrivilege: string;
		enableElasticSearchSecurityFeatures: string;
	}>;
	readonly spaces: Readonly<{
		kibanaLegacyUrlAliases: string;
		kibanaDisableLegacyUrlAliasesApi: string;
		kibanaManageSpaces: string;
	}>;
	readonly watcher: Record<string, string>;
	readonly ccs: Record<string, string>;
	readonly plugins: {
		azureRepo: string;
		gcsRepo: string;
		hdfsRepo: string;
		ingestAttachment: string;
		s3Repo: string;
		snapshotRestoreRepos: string;
		mapperSize: string;
	};
	readonly snapshotRestore: Record<string, string>;
	readonly ingest: Record<string, string>;
	readonly fleet: Readonly<{
		beatsAgentComparison: string;
		guide: string;
		fingerprint: string;
		fleetServer: string;
		fleetServerAddFleetServer: string;
		esSettings: string;
		settings: string;
		logstashSettings: string;
		kafkaSettings: string;
		kafkaOutputTopicsSettings: string;
		settingsFleetServerHostSettings: string;
		settingsFleetServerProxySettings: string;
		troubleshooting: string;
		elasticAgent: string;
		datastreams: string;
		datastreamsILM: string;
		datastreamsNamingScheme: string;
		datastreamsManualRollover: string;
		datastreamsTSDS: string;
		datastreamsTSDSMetrics: string;
		datastreamsDownsampling: string;
		installElasticAgent: string;
		installElasticAgentStandalone: string;
		grantESAccessToStandaloneAgents: string;
		packageSignatures: string;
		upgradeElasticAgent: string;
		learnMoreBlog: string;
		apiKeysLearnMore: string;
		onPremRegistry: string;
		secureLogstash: string;
		agentPolicy: string;
		agentlessIntegrations: string;
		api: string;
		uninstallAgent: string;
		installAndUninstallIntegrationAssets: string;
		elasticAgentInputConfiguration: string;
		policySecrets: string;
		remoteESOoutput: string;
		performancePresets: string;
		scalingKubernetesResourcesAndLimits: string;
		roleAndPrivileges: string;
		proxiesSettings: string;
		unprivilegedMode: string;
		httpMonitoring: string;
		agentLevelLogging: string;
		remoteESOoutputTroubleshooting: string;
		agentReleaseProcess: string;
		fipsIngest: string;
		edotCollector: string;
	}>;
	readonly integrationDeveloper: {
		upload: string;
	};
	readonly ecs: {
		readonly guide: string;
		readonly dataStreams: string;
	};
	readonly clients: {
		readonly guide: string;
		readonly goConnecting: string;
		readonly goGettingStarted: string;
		readonly goIndex: string;
		readonly goOverview: string;
		readonly javaBasicAuthentication: string;
		readonly javaIndex: string;
		readonly javaInstallation: string;
		readonly javaIntroduction: string;
		readonly javaRestLow: string;
		readonly jsAdvancedConfig: string;
		readonly jsApiReference: string;
		readonly jsBasicConfig: string;
		readonly jsClientConnecting: string;
		readonly jsIntro: string;
		readonly netGuide: string;
		readonly netIntroduction: string;
		readonly netNest: string;
		readonly netSingleNode: string;
		readonly phpConfiguration: string;
		readonly phpConnecting: string;
		readonly phpGuide: string;
		readonly phpInstallation: string;
		readonly phpOverview: string;
		readonly pythonAuthentication: string;
		readonly pythonConfig: string;
		readonly pythonConnecting: string;
		readonly pythonGuide: string;
		readonly pythonOverview: string;
		readonly rubyAuthentication: string;
		readonly rubyAdvancedConfig: string;
		readonly rubyBasicConfig: string;
		readonly rubyExamples: string;
		readonly rubyOverview: string;
		readonly rustGuide: string;
		readonly rustOverview: string;
		readonly eland: string;
	};
	readonly endpoints: {
		readonly troubleshooting: string;
	};
	readonly legal: {
		readonly privacyStatement: string;
		readonly generalPrivacyStatement: string;
		readonly termsOfService: string;
		readonly dataUse: string;
	};
	readonly kibanaUpgradeSavedObjects: {
		readonly resolveMigrationFailures: string;
		readonly repeatedTimeoutRequests: string;
		readonly routingAllocationDisabled: string;
		readonly clusterShardLimitExceeded: string;
	};
	readonly searchUI: {
		readonly appSearch: string;
		readonly elasticsearch: string;
	};
	readonly serverlessClients: {
		readonly clientLib: string;
		readonly goApiReference: string;
		readonly goGettingStarted: string;
		readonly httpApis: string;
		readonly httpApiReferences: string;
		readonly jsApiReference: string;
		readonly jsGettingStarted: string;
		readonly phpApiReference: string;
		readonly phpGettingStarted: string;
		readonly pythonApiReference: string;
		readonly pythonGettingStarted: string;
		readonly pythonReferences: string;
		readonly rubyApiReference: string;
		readonly rubyGettingStarted: string;
	};
	readonly serverlessSearch: {
		readonly gettingStartedExplore: string;
		readonly gettingStartedIngest: string;
		readonly gettingStartedSearch: string;
		readonly integrations: string;
		readonly integrationsBeats: string;
		readonly integrationsConnectorClient: string;
		readonly integrationsConnectorClientAvailableConnectors: string;
		readonly integrationsConnectorClientRunFromSource: string;
		readonly integrationsConnectorClientRunWithDocker: string;
		readonly integrationsLogstash: string;
	};
	readonly serverlessSecurity: {
		readonly apiKeyPrivileges: string;
	};
	readonly synthetics: {
		readonly featureRoles: string;
	};
	readonly telemetry: {
		readonly settings: string;
	};
	readonly playground: {
		readonly chatPlayground: string;
		readonly retrievalOptimize: string;
		readonly retrieval: string;
		readonly context: string;
		readonly hiddenFields: string;
	};
	readonly inferenceManagement: {
		readonly inferenceAPIDocumentation: string;
	};
	readonly synonyms: {
		readonly synonymsAPIDocumentation: string;
	};
	readonly queryRules: {
		readonly queryRulesAPIDocumentation: string;
	};
	readonly datasetQuality: {
		readonly failureStore: string;
	};
	readonly agentBuilder: {
		readonly agentBuilder: string;
		readonly getStarted: string;
		readonly models: string;
		readonly chat: string;
		readonly agentBuilderAgents: string;
		readonly tools: string;
		readonly programmaticAccess: string;
		readonly kibanaApi: string;
		readonly mcpServer: string;
		readonly a2aServer: string;
		readonly limitationsKnownIssues: string;
		readonly learnMore: string;
	};
	readonly indexManagement: {
		readonly componentTemplate: string;
		readonly indexAlias: string;
	};
}
interface DocLinksServiceSetup {
	/** The branch/version the docLinks are pointing to */
	readonly version: string;
	/** The base url for the elastic website */
	readonly elasticWebsiteUrl: string;
	/** A record of all registered doc links */
	readonly links: DocLinks;
}
interface ESQLControlVariable {
	key: string;
	value: string | number | (string | number)[];
	type: ESQLVariableType;
}
interface ElasticsearchApiToRedactInLogs {
	/**
	 * The ES path.
	 * - If specified as a string, it'll be checked as `contains`.
	 * - If specified as a RegExp, it'll be tested against the path.
	 */
	path: string | RegExp;
	/**
	 * HTTP method.
	 * If not provided, the path will be checked for all methods.
	 */
	method?: string;
}
interface ElasticsearchCapabilities {
	/**
	 * Indicates whether we're connected to a serverless version of elasticsearch.
	 * Required because some options aren't working for serverless and code needs to have the info to react accordingly.
	 */
	serverless: boolean;
}
interface ElasticsearchClientConfig {
	customHeaders: Record<string, string>;
	requestHeadersWhitelist: string[];
	maxSockets: number;
	maxIdleSockets: number;
	maxResponseSize?: ByteSizeValue;
	idleSocketTimeout: Duration;
	compression: boolean;
	sniffOnStart: boolean;
	sniffOnConnectionFault: boolean;
	sniffInterval: false | Duration;
	username?: string;
	password?: string;
	serviceAccountToken?: string;
	hosts: string[];
	keepAlive?: boolean;
	requestTimeout?: Duration | number;
	caFingerprint?: string;
	ssl?: ElasticsearchClientSslConfig;
	apisToRedactInLogs?: ElasticsearchApiToRedactInLogs[];
	dnsCacheTtl: Duration;
}
interface ElasticsearchClientSslConfig {
	verificationMode?: "none" | "certificate" | "full";
	certificate?: string;
	certificateAuthorities?: string[];
	key?: string;
	keyPassphrase?: string;
	alwaysPresentCertificate?: boolean;
}
interface ElasticsearchClientsMetrics {
	/** Total number of active sockets (all nodes, all connections) */
	totalActiveSockets: number;
	/** Total number of available sockets (alive but idle, all nodes, all connections) */
	totalIdleSockets: number;
	/** Total number of queued requests (all nodes, all connections) */
	totalQueuedRequests: number;
}
interface ElasticsearchPrivilegesType {
	cluster?: string[];
	remote_cluster?: Array<{
		privileges: string[];
		clusters: string[];
	}>;
	indices?: Array<{
		names: string[];
		field_security?: Record<"grant" | "except", string[]>;
		privileges: string[];
		query?: string;
		allow_restricted_indices?: boolean;
	}>;
	remote_indices?: Array<{
		clusters: string[];
		names: string[];
		field_security?: Record<"grant" | "except", string[]>;
		privileges: string[];
		query?: string;
		allow_restricted_indices?: boolean;
	}>;
	run_as?: string[];
}
interface ElasticsearchRequestHandlerContext {
	client: IScopedClusterClient;
}
interface ElasticsearchServiceSetup {
	/**
	 * Register a handler that will be called when unauthorized (401) errors are returned from any API
	 * call to elasticsearch performed on behalf of a user via a {@link IScopedClusterClient | scoped cluster client}.
	 *
	 * @example
	 * ```ts
	 * const handler: UnauthorizedErrorHandler = ({ request, error }, toolkit) => {
	 *   const reauthenticationResult = await authenticator.reauthenticate(request, error);
	 *   if (reauthenticationResult.succeeded()) {
	 *     return toolkit.retry({
	 *       authHeaders: reauthenticationResult.authHeaders,
	 *     });
	 *   }
	 *   return toolkit.notHandled();
	 * }
	 *
	 * coreSetup.elasticsearch.setUnauthorizedErrorHandler(handler);
	 * ```
	 *
	 * @remarks The handler will only be invoked for scoped client bound to real {@link KibanaRequest | request} instances.
	 */
	setUnauthorizedErrorHandler: (handler: UnauthorizedErrorHandler) => void;
	/**
	 * @deprecated Can be removed when https://github.com/elastic/kibana/issues/119862 is done.
	 */
	legacy: {
		/**
		 * Provide direct access to the current elasticsearch configuration.
		 *
		 * @deprecated Can be removed when https://github.com/elastic/kibana/issues/119862 is done.
		 */
		readonly config$: Observable<IElasticsearchConfig>;
	};
	/**
	 * The public base URL (if any) that should be used by end users to access the Elasticsearch cluster.
	 */
	readonly publicBaseUrl?: string;
	/**
	 * Sets the CPS feature flag in the Elasticsearch service.
	 * This should only be called from the CPS plugin.
	 *
	 * @example
	 * ```ts
	 * core.elasticsearch.setCpsFeatureFlag(true);
	 * ```
	 */
	setCpsFeatureFlag: (enabled: boolean) => void;
}
interface ElasticsearchServiceStart {
	/**
	 * A pre-configured {@link IClusterClient | Elasticsearch client}
	 *
	 * @example
	 * ```js
	 * const client = core.elasticsearch.client;
	 * ```
	 */
	readonly client: IClusterClient;
	/**
	 * Create application specific Elasticsearch cluster API client with customized config. See {@link IClusterClient}.
	 *
	 * @param type Unique identifier of the client
	 * @param clientConfig A config consists of Elasticsearch JS client options and
	 * valid sub-set of Elasticsearch service config.
	 * We fill all the missing properties in the `clientConfig` using the default
	 * Elasticsearch config so that we don't depend on default values set and
	 * controlled by underlying Elasticsearch JS client.
	 * We don't run validation against the passed config and expect it to be valid.
	 *
	 * @example
	 * ```js
	 * const client = elasticsearch.createClient('my-app-name', config);
	 * const data = await client.asInternalUser.search();
	 * ```
	 */
	readonly createClient: (type: string, clientConfig?: Partial<ElasticsearchClientConfig>) => ICustomClusterClient;
	/**
	 * Returns the capabilities for the default cluster.
	 */
	getCapabilities: () => ElasticsearchCapabilities;
	/**
	 * The public base URL (if any) that should be used by end users to access the Elasticsearch cluster.
	 */
	readonly publicBaseUrl?: string;
}
interface ElasticsearchSslConfig {
	verificationMode: "none" | "certificate" | "full";
	certificate?: string;
	certificateAuthorities?: string[];
	key?: string;
	keyPassphrase?: string;
	alwaysPresentCertificate: boolean;
}
interface EluMetrics {
	/**
	 * The long-term event loop utilization history.
	 */
	long: number;
	/**
	 * The medium-term event loop utilization history.
	 */
	medium: number;
	/**
	 * The short-term event loop utilization history.
	 */
	short: number;
}
interface EncryptedObjectDescriptor {
	/** The Saved Object type */
	type: string;
	/** The Saved Object ID */
	id: string;
	/** Namespace for use in index migration...
	 * If the object is being decrypted during index migration, the object was previously
	 * encrypted with its namespace in the descriptor portion of the AAD; on the other hand,
	 * if the object is being decrypted during object migration, the object was never encrypted
	 * with its namespace in the descriptor portion of the AAD. */
	namespace?: string;
}
interface EnvironmentMode {
	name: "development" | "production";
	dev: boolean;
	prod: boolean;
}
interface ErrorHttpResponseOptions {
	/** HTTP message to send to the client */
	body?: ResponseError;
	/** HTTP Headers with additional information about response */
	headers?: ResponseHeaders;
}
interface ExecutionContext<InspectorAdapters extends Adapters = Adapters> {
	/**
	 * Get search context of the expression.
	 */
	getSearchContext: () => ExecutionContextSearch;
	/**
	 * Context variables that can be consumed using `var` and `var_set` functions.
	 */
	variables: Record<string, unknown>;
	/**
	 * A map of available expression types.
	 */
	types: Record<string, ExpressionType>;
	/**
	 * Allow caching in the current execution.
	 */
	allowCache?: boolean;
	/**
	 * Adds ability to abort current execution.
	 */
	abortSignal: AbortSignal;
	/**
	 * Adapters for `inspector` plugin.
	 */
	inspectorAdapters: InspectorAdapters;
	/**
	 * Search context in which expression should operate.
	 */
	getSearchSessionId: () => string | undefined;
	/**
	 * Getter to retrieve the `KibanaRequest` object inside an expression function.
	 * Useful for functions which are running on the server and need to perform
	 * operations that are scoped to a specific user.
	 */
	getKibanaRequest?: () => KibanaRequest;
	/**
	 * Returns the state (true|false) of the sync colors across panels switch.
	 */
	isSyncColorsEnabled?: () => boolean;
	/**
	 * Returns the state (true|false) of the sync cursor across panels switch.
	 */
	isSyncCursorEnabled?: () => boolean;
	/**
	 * Returns the state (true|false) of the sync tooltips across panels switch.
	 */
	isSyncTooltipsEnabled?: () => boolean;
	/**
	 * Contains the meta-data about the source of the expression.
	 */
	getExecutionContext: () => KibanaExecutionContext | undefined;
	/**
	 * Logs datatable.
	 */
	logDatatable?(name: string, datatable: Datatable): void;
}
interface ExecutionContextSearch {
	now?: number;
	filters?: Filter[];
	query?: Query | Query[];
	timeRange?: TimeRange;
	disableWarningToasts?: boolean;
	esqlVariables?: ESQLControlVariable[];
	projectRouting?: ProjectRouting;
}
interface ExecutionContextSetup {
	/**
	 * Keeps track of execution context while the passed function is executed.
	 * Data are carried over all async operations spawned by the passed function.
	 * The nested calls stack the registered context on top of each other.
	 **/
	withContext<R>(context: KibanaExecutionContext | undefined, fn: (...args: any[]) => R): R;
	getAsLabels(): apm.Labels;
}
interface ExecutionParams {
	executor: Executor;
	ast?: ExpressionAstExpression;
	expression?: string;
	params: ExpressionExecutionParams;
}
interface ExecutionPureTransitions<Output = ExpressionValue> {
	start: (state: ExecutionState<Output>) => () => ExecutionState<Output>;
	setResult: (state: ExecutionState<Output>) => (result: Output) => ExecutionState<Output>;
	setError: (state: ExecutionState<Output>) => (error: Error) => ExecutionState<Output>;
}
interface ExecutionResult<Output> {
	/**
	 * Partial result flag.
	 */
	partial: boolean;
	/**
	 * The expression function result.
	 */
	result: Output;
}
interface ExecutionState<Output = ExpressionValue> extends ExecutorState {
	ast: ExpressionAstExpression;
	/**
	 * Tracks state of execution.
	 *
	 * - `not-started` - before .start() method was called.
	 * - `pending` - immediately after .start() method is called.
	 * - `result` - when expression execution completed.
	 * - `error` - when execution failed with error.
	 */
	state: "not-started" | "pending" | "result" | "error";
	/**
	 * Result of the expression execution.
	 */
	result?: Output;
	/**
	 * Error happened during the execution.
	 */
	error?: Error;
}
interface ExecutorPureSelectors {
	getFunction: (state: ExecutorState) => (id: string) => ExpressionFunction | null;
	getType: (state: ExecutorState) => (id: string) => ExpressionType | null;
	getContext: (state: ExecutorState) => () => ExecutorState["context"];
}
interface ExecutorPureTransitions {
	addFunction: (state: ExecutorState) => (fn: ExpressionFunction) => ExecutorState;
	addType: (state: ExecutorState) => (type: ExpressionType) => ExecutorState;
}
interface ExecutorState<Context extends Record<string, unknown> = Record<string, unknown>> {
	functions: Record<string, ExpressionFunction>;
	types: Record<string, ExpressionType>;
	context: Context;
}
interface ExpressionExecutionParams {
	searchContext?: ExecutionContextSearch;
	variables?: Record<string, unknown>;
	/**
	 * Whether to execute expression in *debug mode*. In *debug mode* inputs and
	 * outputs as well as all resolved arguments and time it took to execute each
	 * function are saved and are available for introspection.
	 */
	debug?: boolean;
	/**
	 * Makes a `KibanaRequest` object available to expression functions. Useful for
	 * functions which are running on the server and need to perform operations that
	 * are scoped to a specific user.
	 */
	kibanaRequest?: KibanaRequest;
	searchSessionId?: string;
	syncColors?: boolean;
	syncCursor?: boolean;
	syncTooltips?: boolean;
	inspectorAdapters?: Adapters;
	executionContext?: KibanaExecutionContext;
	namespace?: string;
	/**
	 * Toggles the partial results support.
	 * @default false
	 */
	partial?: boolean;
	/**
	 * Throttling of partial results in milliseconds. 0 is disabling the throttling.
	 * @deafult 0
	 */
	throttle?: number;
	allowCache?: boolean;
}
interface ExpressionFunctionDefinition<Name extends string, Input, Arguments extends Record<keyof unknown, unknown>, Output, Context extends ExecutionContext = ExecutionContext> extends PersistableStateDefinition<ExpressionAstFunction["arguments"]> {
	/**
	 * The name of the function, as will be used in expression.
	 */
	name: Name;
	/**
	 * The flag to mark the function as deprecated.
	 */
	deprecated?: boolean;
	/**
	 * if set to true function will be disabled (but its migrate function will still be available)
	 */
	disabled?: boolean;
	namespace?: string;
	/**
	 * Name of type of value this function outputs.
	 */
	type?: TypeString<Output> | UnmappedTypeStrings;
	/**
	 * Opt-in to caching this function. By default function outputs are cached and given the same inputs cached result is returned.
	 *
	 * It is possible to collect side effects produced by the function
	 * (e.g. logging, sending events to the server, etc.) and return a
	 * handler to reproduce such side effects when the function cache is used
	 * instead of the original function implementation.
	 * @param args Parameters set for this function in expression.
	 * @param context Object with functions to perform side effects. This object
	 *     is created for the duration of the execution of expression and is the
	 *     same for all functions in expression chain.
	 * @returns A handler to be called to reproduce side effects when the function cache is used.
	 *
	 */
	allowCache?: boolean | {
		withSideEffects(args: Arguments, context: Context): () => void;
	};
	/**
	 * List of allowed type names for input value of this function. If this
	 * property is set the input of function will be cast to the first possible
	 * type in this list. If this property is missing the input will be provided
	 * to the function as-is.
	 */
	inputTypes?: Array<TypeToString<Input>>;
	/**
	 * Specification of arguments that function supports. This list will also be
	 * used for autocomplete functionality when your function is being edited.
	 */
	args: {
		[key in keyof Arguments]: ArgumentType<Arguments[key]>;
	};
	/**
	 * @todo What is this?
	 */
	aliases?: string[];
	/**
	 * Help text displayed in the Expression editor. This text should be
	 * internationalized.
	 */
	help: string;
	/**
	 * The actual implementation of the function.
	 *
	 * @param input Output of the previous function, or initial input.
	 * @param args Parameters set for this function in expression.
	 * @param context Object with functions to perform side effects. This object
	 *     is created for the duration of the execution of expression and is the
	 *     same for all functions in expression chain.
	 */
	fn(input: Input, args: Arguments, context: Context): Output;
	/**
	 * @deprecated Use `inputTypes` instead.
	 */
	context?: {
		/**
		 * @deprecated This is alias for `inputTypes`, use `inputTypes` instead.
		 */
		types: AnyExpressionFunctionDefinition["inputTypes"];
	};
}
interface ExpressionRenderDefinition<Config = unknown> {
	/**
	 * Technical name of the renderer, used as ID to identify renderer in
	 * expression renderer registry. This must match the name of the expression
	 * function that is used to create the `type: render` object.
	 */
	name: string;
	namespace?: string;
	/**
	 * A user friendly name of the renderer as will be displayed to user in UI.
	 */
	displayName?: string;
	/**
	 * Help text as will be displayed to user. A sentence or few about what this
	 * element does.
	 */
	help?: string;
	/**
	 * Used to validate the data before calling the render function.
	 */
	validate?: () => undefined | Error;
	/**
	 * Tell the renderer if the dom node should be reused, it's recreated each
	 * time by default.
	 */
	reuseDomNode: boolean;
	/**
	 * The function called to render the output data of an expression.
	 */
	render: (domNode: HTMLElement, config: Config, handlers: IInterpreterRenderHandlers) => void | Promise<void>;
}
interface ExpressionServiceFork {
	setup(): ExpressionsServiceSetup;
	start(): ExpressionsServiceStart;
}
interface ExpressionServiceParams {
	executor?: Executor;
	logger?: Logger;
	renderers?: ExpressionRendererRegistry;
}
interface ExpressionTypeDefinition<Name extends string, Value extends ExpressionValueUnboxed | ExpressionValueBoxed, SerializedType = undefined> {
	name: Name;
	namespace?: string;
	validate?(type: unknown): void | Error;
	serialize?(type: Value): SerializedType;
	deserialize?(type: SerializedType): Value;
	from?: {
		[type: string]: ExpressionValueConverter<ExpressionValue, Value>;
	};
	to?: {
		[type: string]: ExpressionValueConverter<Value, ExpressionValue>;
	};
	help?: string;
}
interface ExpressionsServiceSetup {
	/**
	 * Get a registered `ExpressionFunction` by its name, which was registered
	 * using the `registerFunction` method. The returned `ExpressionFunction`
	 * instance is an internal representation of the function in Expressions
	 * service - do not mutate that object.
	 * @deprecated Use start contract instead.
	 */
	getFunction(name: string, namespace?: string): ReturnType<Executor["getFunction"]>;
	/**
	 * Returns POJO map of all registered expression functions, where keys are
	 * names of the functions and values are `ExpressionFunction` instances.
	 * @deprecated Use start contract instead.
	 */
	getFunctions(namespace?: string): ReturnType<Executor["getFunctions"]>;
	/**
	 * Returns POJO map of all registered expression types, where keys are
	 * names of the types and values are `ExpressionType` instances.
	 * @deprecated Use start contract instead.
	 */
	getTypes(): ReturnType<Executor["getTypes"]>;
	/**
	 * Create a new instance of `ExpressionsService`. The new instance inherits
	 * all state of the original `ExpressionsService`, including all expression
	 * types, expression functions and context. Also, all new types and functions
	 * registered in the original services AFTER the forking event will be
	 * available in the forked instance. However, all new types and functions
	 * registered in the forked instances will NOT be available to the original
	 * service.
	 * @param name A fork name that can be used to get fork instance later.
	 */
	fork(namespace: string): ExpressionsServiceFork;
	/**
	 * Register an expression function, which will be possible to execute as
	 * part of the expression pipeline.
	 *
	 * Below we register a function which simply sleeps for given number of
	 * milliseconds to delay the execution and outputs its input as-is.
	 *
	 * ```ts
	 * expressions.registerFunction({
	 *   name: 'sleep',
	 *   args: {
	 *     time: {
	 *       aliases: ['_'],
	 *       help: 'Time in milliseconds for how long to sleep',
	 *       types: ['number'],
	 *     },
	 *   },
	 *   help: '',
	 *   fn: async (input, args, context) => {
	 *     await new Promise(r => setTimeout(r, args.time));
	 *     return input;
	 *   },
	 * }
	 * ```
	 *
	 * The actual function is defined in the `fn` key. The function can be *async*.
	 * It receives three arguments: (1) `input` is the output of the previous function
	 * or the initial input of the expression if the function is first in chain;
	 * (2) `args` are function arguments as defined in expression string, that can
	 * be edited by user (e.g in case of Canvas); (3) `context` is a shared object
	 * passed to all functions that can be used for side-effects.
	 */
	registerFunction(functionDefinition: AnyExpressionFunctionDefinition | (() => AnyExpressionFunctionDefinition)): void;
	registerType(typeDefinition: AnyExpressionTypeDefinition | (() => AnyExpressionTypeDefinition)): void;
	registerRenderer(definition: AnyExpressionRenderDefinition | (() => AnyExpressionRenderDefinition)): void;
	getAllMigrations(): MigrateFunctionsObject;
}
interface ExpressionsServiceStart {
	/**
	 * Get a registered `ExpressionFunction` by its name, which was registered
	 * using the `registerFunction` method. The returned `ExpressionFunction`
	 * instance is an internal representation of the function in Expressions
	 * service - do not mutate that object.
	 */
	getFunction(name: string, namespace?: string): ReturnType<Executor["getFunction"]>;
	/**
	 * Returns POJO map of all registered expression functions, where keys are
	 * names of the functions and values are `ExpressionFunction` instances.
	 */
	getFunctions(namespace?: string): ReturnType<Executor["getFunctions"]>;
	/**
	 * Get a registered `ExpressionRenderer` by its name, which was registered
	 * using the `registerRenderer` method. The returned `ExpressionRenderer`
	 * instance is an internal representation of the renderer in Expressions
	 * service - do not mutate that object.
	 */
	getRenderer(name: string): ReturnType<ExpressionRendererRegistry["get"]>;
	/**
	 * Returns POJO map of all registered expression renderers, where keys are
	 * names of the renderers and values are `ExpressionRenderer` instances.
	 */
	getRenderers(): ReturnType<ExpressionRendererRegistry["toJS"]>;
	/**
	 * Get a registered `ExpressionType` by its name, which was registered
	 * using the `registerType` method. The returned `ExpressionType`
	 * instance is an internal representation of the type in Expressions
	 * service - do not mutate that object.
	 */
	getType(name: string): ReturnType<Executor["getType"]>;
	/**
	 * Returns POJO map of all registered expression types, where keys are
	 * names of the types and values are `ExpressionType` instances.
	 */
	getTypes(): ReturnType<Executor["getTypes"]>;
	/**
	 * Executes expression string or a parsed expression AST and immediately
	 * returns the result.
	 *
	 * Below example will execute `sleep 100 | clog` expression with `123` initial
	 * input to the first function.
	 *
	 * ```ts
	 * expressions.run('sleep 100 | clog', 123);
	 * ```
	 *
	 * - `sleep 100` will delay execution by 100 milliseconds and pass the `123` input as
	 *   its output.
	 * - `clog` will print to console `123` and pass it as its output.
	 * - The final result of the execution will be `123`.
	 *
	 * Optionally, you can pass an object as the third argument which will be used
	 * to extend the `ExecutionContext`&mdash;an object passed to each function
	 * as the third argument, that allows functions to perform side-effects.
	 *
	 * ```ts
	 * expressions.run('...', null, { elasticsearchClient });
	 * ```
	 */
	run<Input, Output>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): Observable<ExecutionResult<Output | ExpressionValueError>>;
	/**
	 * Starts expression execution and immediately returns `ExecutionContract`
	 * instance that tracks the progress of the execution and can be used to
	 * interact with the execution.
	 */
	execute<Input = unknown, Output = unknown>(ast: string | ExpressionAstExpression, input: Input, params?: ExpressionExecutionParams): ExecutionContract<Input, Output>;
	extract(state: ExpressionAstExpression): {
		state: ExpressionAstExpression;
		references: SavedObjectReference$1[];
	};
	inject(state: ExpressionAstExpression, references: SavedObjectReference$1[]): ExpressionAstExpression;
	telemetry(state: ExpressionAstExpression, telemetryData: Record<string, unknown>): Record<string, unknown>;
	getAllMigrations(): MigrateFunctionsObject;
}
interface ExtendsDeepOptions {
	unknowns?: OptionsForUnknowns;
}
interface FakeRequest {
	/** Headers used for authentication against Elasticsearch */
	headers: Headers$1;
}
interface FeatureDeprecationDetails extends BaseDeprecationDetails {
	deprecationType?: "feature" | undefined;
}
interface FeatureFlagsSetup {
	/**
	 * Registers an OpenFeature provider to talk to the
	 * 3rd-party service that manages the Feature Flags.
	 * @param provider The {@link Provider | OpenFeature Provider} to handle the communication with the feature flags management system.
	 * @public
	 */
	setProvider(provider: Provider): void;
	/**
	 * Appends new keys to the evaluation context.
	 * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
	 * @public
	 */
	appendContext(contextToAppend: EvaluationContext): void;
	/**
	 * Registers a getter function that will be used to retrieve the initial feature flags to be injected into the
	 * browser for faster bootstrapping.
	 * @param getter A function that returns all the feature flags and their values for this context.
	 * Ideally, using the underlying API shouldn't track them as actual evaluations.
	 * @internal
	 */
	setInitialFeatureFlagsGetter(getter: InitialFeatureFlagsGetter): void;
}
interface FeatureFlagsStart {
	/**
	 * Appends new keys to the evaluation context.
	 * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
	 * @public
	 */
	appendContext(contextToAppend: EvaluationContext): void;
	/**
	 * Evaluates a boolean flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;
	/**
	 * Evaluates a string flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;
	/**
	 * Evaluates a number flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;
	/**
	 * Returns an observable of a boolean flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getBooleanValue$(flagName: string, fallbackValue: boolean): Observable<boolean>;
	/**
	 * Returns an observable of a string flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getStringValue$<Value extends string>(flagName: string, fallbackValue: Value): Observable<Value>;
	/**
	 * Returns an observable of a number flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getNumberValue$<Value extends number>(flagName: string, fallbackValue: Value): Observable<Value>;
}
interface FileAppenderConfig {
	type: "file";
	layout: LayoutConfigType;
	fileName: string;
}
interface FileHttpResponseOptions<T extends HttpResponsePayload | ResponseError> {
	/** Attachment content to send to the client */
	body: T;
	/** Attachment name, encoded and added to the headers to send to the client */
	filename: string;
	/** Explicitly set the attachment content type. Tries to detect the type based on extension and defaults to application/octet-stream */
	fileContentType?: string | null;
	/** Attachment content size in bytes, Tries to detect the content size from body */
	fileContentSize?: number;
	/** HTTP Headers with additional information about response */
	headers?: ResponseHeaders;
	/** Bypass the default error formatting */
	bypassErrorFormat?: boolean;
	/** Bypass filename encoding, only set to true if the filename is already encoded */
	bypassFileNameEncoding?: boolean;
}
interface FoundPluginContractResolverResponseItem<ContractType = unknown> {
	found: true;
	contract: ContractType;
}
interface FunctionCacheItem {
	value: unknown;
	time: number;
	sideEffectFn?: () => void;
}
interface GetDeprecationsContext {
	/** Elasticsearch client scoped to the current user */
	esClient: IScopedClusterClient;
	/** Saved Objects client scoped to the current user and space */
	savedObjectsClient: SavedObjectsClientContract;
	request: KibanaRequest;
}
interface GetFindRedactTypeMapParams {
	/** The namespaces previously checked by the AuthorizeFind method */
	previouslyCheckedNamespaces: Set<string>;
	/**
	 * The objects to authorize in order to generate the type map
	 * this should be populated by the result of the es query
	 */
	objects: AuthorizeObjectWithExistingSpaces[];
}
interface GetUiSettingsContext {
	request?: KibanaRequest;
}
interface GrantAPIKeyResult {
	/**
	 * Unique id for this API key
	 */
	id: string;
	/**
	 * Name for this API key
	 */
	name: string;
	/**
	 * Generated API key
	 */
	api_key: string;
}
interface HttpAuth {
	/**
	 * Gets authentication state for a request. Returned by `auth` interceptor.
	 * {@link GetAuthState}
	 */
	get: GetAuthState;
	/**
	 * Returns authentication status for a request.
	 * {@link IsAuthenticated}
	 */
	isAuthenticated: IsAuthenticated;
}
interface HttpResources {
	/** To register a route handler executing passed function to form response. */
	register: <P, Q, B, Context extends RequestHandlerContext = RequestHandlerContext>(route: RouteConfig<P, Q, B, "get">, handler: HttpResourcesRequestHandler<P, Q, B, Context>) => void;
}
interface HttpResourcesRenderOptions {
	/**
	 * HTTP Headers with additional information about response.
	 * @remarks
	 * All HTML pages are already pre-configured with `content-security-policy` header that cannot be overridden.
	 * */
	headers?: ResponseHeaders;
	/**
	 * @internal
	 * This is only used for integration tests that allow us to verify which config keys are exposed to the browser.
	 */
	includeExposedConfigKeys?: boolean;
}
interface HttpResourcesServiceToolkit {
	/** To respond with HTML page bootstrapping Kibana application. */
	renderCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
	/**
	 * To respond with HTML page bootstrapping Kibana application without retrieving user-specific information.
	 * **Note:**
	 * - Your client-side JavaScript bundle will only be loaded on an anonymous page if `plugin.enabledOnAnonymousPages` is enabled in your plugin's `kibana.jsonc` manifest file.
	 * - You will also need to register the route serving your anonymous app with the `coreSetup.http.anonymousPaths` service in your plugin's client-side `setup` method.
	 * */
	renderAnonymousCoreApp: (options?: HttpResourcesRenderOptions) => Promise<IKibanaResponse>;
	/** To respond with a custom HTML page. */
	renderHtml: (options: HttpResourcesResponseOptions) => IKibanaResponse;
	/** To respond with a custom JS script file. */
	renderJs: (options: HttpResourcesResponseOptions) => IKibanaResponse;
	/** To respond with a custom CSS script file. */
	renderCss: (options: HttpResourcesResponseOptions) => IKibanaResponse;
}
interface HttpResponseOptions<T extends HttpResponsePayload | ResponseError = any> {
	/** HTTP message to send to the client */
	body?: T;
	/** HTTP Headers with additional information about response */
	headers?: ResponseHeaders;
	/** Bypass the default error formatting */
	bypassErrorFormat?: boolean;
}
interface HttpServerInfo {
	/** The name of the Kibana server */
	name: string;
	/** The hostname of the server */
	hostname: string;
	/** The port the server is listening on */
	port: number;
	/** The protocol used by the server */
	protocol: "http" | "https" | "socket";
}
interface HttpServiceSetup<DefaultRequestHandlerType extends RequestHandlerContextBase = RequestHandlerContextBase> {
	/**
	 * Creates cookie based session storage factory {@link SessionStorageFactory}
	 * @param cookieOptions {@link SessionStorageCookieOptions} - options to configure created cookie session storage.
	 */
	createCookieSessionStorageFactory: <T extends object>(cookieOptions: SessionStorageCookieOptions<T>) => Promise<SessionStorageFactory<T>>;
	/**
	 * To define custom logic to perform for incoming requests before server performs a route lookup.
	 *
	 * @remarks
	 * It's the only place when you can forward a request to another URL right on the server.
	 * Can register any number of registerOnPreRouting, which are called in sequence
	 * (from the first registered to the last). See {@link OnPreRoutingHandler}.
	 *
	 * @param handler {@link OnPreRoutingHandler} - function to call.
	 */
	registerOnPreRouting: (handler: OnPreRoutingHandler) => void;
	/**
	 * To define custom logic to perform for incoming requests before
	 * the Auth interceptor performs a check that user has access to requested resources.
	 *
	 * @remarks
	 * Can register any number of registerOnPreAuth, which are called in sequence
	 * (from the first registered to the last). See {@link OnPreAuthHandler}.
	 *
	 * @param handler {@link OnPreRoutingHandler} - function to call.
	 */
	registerOnPreAuth: (handler: OnPreAuthHandler) => void;
	/**
	 * To define custom authentication and/or authorization mechanism for incoming requests.
	 *
	 * @remarks
	 * A handler should return a state to associate with the incoming request.
	 * The state can be retrieved later via http.auth.get(..)
	 * Only one AuthenticationHandler can be registered. See {@link AuthenticationHandler}.
	 *
	 * @param handler {@link AuthenticationHandler} - function to perform authentication.
	 */
	registerAuth: (handler: AuthenticationHandler) => void;
	/**
	 * To define custom logic after Auth interceptor did make sure a user has access to the requested resource.
	 *
	 * @remarks
	 * The auth state is available at stage via http.auth.get(..)
	 * Can register any number of registerOnPostAuth, which are called in sequence
	 * (from the first registered to the last). See {@link OnPostAuthHandler}.
	 *
	 * @param handler {@link OnPostAuthHandler} - function to call.
	 */
	registerOnPostAuth: (handler: OnPostAuthHandler) => void;
	/**
	 * To define custom logic to perform for the server response.
	 *
	 * @remarks
	 * Doesn't provide the whole response object.
	 * Supports extending response with custom headers.
	 * See {@link OnPreResponseHandler}.
	 *
	 * @param handler {@link OnPreResponseHandler} - function to call.
	 */
	registerOnPreResponse: (handler: OnPreResponseHandler) => void;
	/**
	 * Access or manipulate the Kibana base path
	 * See {@link IBasePath}.
	 */
	basePath: IBasePath;
	/**
	 * APIs for creating hrefs to static assets.
	 * See {@link IStaticAssets}
	 */
	staticAssets: IStaticAssets;
	/**
	 * The CSP config used for Kibana.
	 */
	csp: ICspConfig;
	/**
	 * Provides ability to declare a handler function for a particular path and HTTP request method.
	 *
	 * @remarks
	 * Each route can have only one handler function, which is executed when the route is matched.
	 * See the {@link IRouter} documentation for more information.
	 *
	 * @example
	 * ```ts
	 * const router = createRouter();
	 * // handler is called when '/path' resource is requested with `GET` method
	 * router.get({ path: '/path', validate: false }, (context, req, res) => res.ok({ content: 'ok' }));
	 * ```
	 * @public
	 */
	createRouter: <Context extends DefaultRequestHandlerType = DefaultRequestHandlerType>() => IRouter<Context>;
	/**
	 * Register a context provider for a route handler.
	 * @example
	 * ```ts
	 *  // my-plugin.ts
	 *  interface MyRequestHandlerContext extends RequestHandlerContext {
	 *    myApp: { search(id: string): Promise<Result> };
	 *  }
	 *  deps.http.registerRouteHandlerContext<MyRequestHandlerContext, 'myApp'>(
	 *    'myApp',
	 *    (context, req) => {
	 *     async function search (id: string) {
	 *       return await context.elasticsearch.client.asCurrentUser.find(id);
	 *     }
	 *     return { search };
	 *    }
	 *  );
	 *
	 * // my-route-handler.ts
	 *  import type { MyRequestHandlerContext } from './my-plugin.ts';
	 *  const router = createRouter<MyRequestHandlerContext>();
	 *  router.get({ path: '/', validate: false }, async (context, req, res) => {
	 *    const response = await context.myApp.search(...);
	 *    return res.ok(response);
	 *  });
	 * ```
	 * @public
	 */
	registerRouteHandlerContext: <Context extends DefaultRequestHandlerType, ContextName extends keyof Omit<Context, "resolve">>(contextName: ContextName, provider: IContextProvider<Context, ContextName>) => IContextContainer;
	/**
	 * Provides common {@link HttpServerInfo | information} about the running http server.
	 */
	getServerInfo: () => HttpServerInfo;
	/**
	 * Provides a list of all registered deprecated routes {{@link RouterDeprecatedApiDetails | information}}.
	 * The routers will be evaluated everytime this function gets called to
	 * accommodate for any late route registrations
	 * @returns {RouterDeprecatedApiDetails[]}
	 */
	getDeprecatedRoutes: () => RouterDeprecatedApiDetails[];
}
interface HttpServiceStart {
	/**
	 * Access or manipulate the Kibana base path
	 * See {@link IBasePath}.
	 */
	basePath: IBasePath;
	/**
	 * APIs for creating hrefs to static assets.
	 * See {@link IStaticAssets}
	 */
	staticAssets: IStaticAssets;
	/**
	 * Auth status.
	 * See {@link HttpAuth}
	 */
	auth: HttpAuth;
	/**
	 * Provides common {@link HttpServerInfo | information} about the running http server.
	 */
	getServerInfo: () => HttpServerInfo;
}
interface I18nServiceSetup {
	/**
	 * Return the locale currently in use.
	 */
	getLocale(): string;
	/**
	 * Return the absolute paths to translation files currently in use.
	 */
	getTranslationFiles(): string[];
	/**
	 * Returns the hash generated from the current translations.
	 */
	getTranslationHash(): string;
}
interface IBasePath {
	/**
	 * returns the server's basePath.
	 *
	 * See {@link IBasePath.get} for getting the basePath value for a specific request
	 */
	readonly serverBasePath: string;
	/**
	 * The server's publicly exposed base URL, if configured. Includes protocol, host, port (optional) and the
	 * {@link IBasePath.serverBasePath}.
	 *
	 * @remarks
	 * Should be used for generating external URL links back to this Kibana instance.
	 */
	readonly publicBaseUrl?: string;
	/**
	 * returns `basePath` value, specific for an incoming request.
	 */
	get(request: KibanaRequest): string;
	/**
	 * sets `basePath` value, specific for an incoming request.
	 */
	set(request: KibanaRequest, requestSpecificBasePath: string): void;
	/**
	 * Prepends `path` with the basePath.
	 */
	prepend(path: string): string;
	/**
	 * Removes the prepended basePath from the `path`.
	 */
	remove(path: string): string;
}
interface IClusterClient {
	/**
	 * A {@link ElasticsearchClient | client} to be used to query the ES cluster on behalf of the Kibana internal user
	 */
	readonly asInternalUser: ElasticsearchClient;
	/**
	 * Creates a {@link IScopedClusterClient | scoped cluster client} bound to given {@link ScopeableRequest | request}
	 */
	asScoped: (request: ScopeableRequest) => IScopedClusterClient;
}
interface IContextContainer {
	/**
	 * Register a new context provider.
	 *
	 * @remarks
	 * The value (or resolved Promise value) returned by the `provider` function will be attached to the context object
	 * on the key specified by `contextName`.
	 *
	 * Throws an exception if more than one provider is registered for the same `contextName`.
	 *
	 * @param pluginOpaqueId - The plugin opaque ID for the plugin that registers this context.
	 * @param contextName - The key of the `TContext` object this provider supplies the value for.
	 * @param provider - A {@link IContextProvider} to be called each time a new context is created.
	 * @returns The {@link IContextContainer} for method chaining.
	 */
	registerContext<Context extends RequestHandlerContextBase, ContextName extends keyof Context>(pluginOpaqueId: PluginOpaqueId, contextName: ContextName, provider: IContextProvider<Context, ContextName>): this;
	/**
	 * Create a new handler function pre-wired to context for the plugin.
	 *
	 * @param pluginOpaqueId - The plugin opaque ID for the plugin that registers this handler.
	 * @param handler - Handler function to pass context object to.
	 * @returns A function that takes `RequestHandler` parameters, calls `handler` with a new context, and returns a Promise of
	 * the `handler` return value.
	 */
	createHandler(pluginOpaqueId: PluginOpaqueId, handler: RequestHandler): (...rest: HandlerParameters<RequestHandler>) => ShallowPromise<ReturnType<RequestHandler>>;
}
interface ICspConfig {
	/**
	 * Specify whether browsers that do not support CSP should be
	 * able to use Kibana. Use `true` to block and `false` to allow.
	 */
	readonly strict: boolean;
	/**
	 * Specify whether users with legacy browsers should be warned
	 * about their lack of Kibana security compliance.
	 */
	readonly warnLegacyBrowsers: boolean;
	/**
	 * Whether or not embedding (using iframes) should be allowed by the CSP. If embedding is disabled, a restrictive 'frame-ancestors' rule will be added to the default CSP rules.
	 */
	readonly disableEmbedding: boolean;
	/**
	 * The CSP rules in a formatted directives string for use
	 * in a `Content-Security-Policy` header.
	 */
	readonly header: string;
	/**
	 * The CSP rules in a formatted directives string for use
	 * in a `Content-Security-Policy-Report-Only` header.
	 */
	readonly reportOnlyHeader: string;
}
interface ICustomClusterClient extends IClusterClient {
	/**
	 * Closes the cluster client. After that client cannot be used and one should
	 * create a new client instance to be able to interact with Elasticsearch API.
	 */
	close: () => Promise<void>;
}
interface IDataStreamClient<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings = never> extends InternalIDataStreamClient<MappingsInDefinition, FullDocumentType, SRM> {
	/** Clint Helpers */
	helpers: ClientHelpers<SRM>;
}
interface IElasticsearchConfig {
	/**
	 * The interval between health check requests Kibana sends to the Elasticsearch before the first green signal.
	 */
	readonly healthCheckStartupDelay: Duration;
	/**
	 * The interval between health check requests Kibana sends to the Elasticsearch after the first green signal.
	 */
	readonly healthCheckDelay: Duration;
	/**
	 * The number of times to retry the health check request
	 */
	readonly healthCheckRetry: number;
	/**
	 * Whether to allow kibana to connect to a non-compatible elasticsearch node.
	 */
	readonly ignoreVersionMismatch: boolean;
	/**
	 * Version of the Elasticsearch (6.7, 7.1 or `master`) client will be connecting to.
	 */
	readonly apiVersion: string;
	/**
	 * The maximum number of sockets that can be used for communications with elasticsearch.
	 */
	readonly maxSockets: number;
	/**
	 * The maximum number of idle sockets to keep open between Kibana and Elasticsearch. If more sockets become idle, they will be closed.
	 */
	readonly maxIdleSockets: number;
	/**
	 * The timeout for idle sockets kept open between Kibana and Elasticsearch. If the socket is idle for longer than this timeout, it will be closed.
	 */
	readonly idleSocketTimeout: Duration;
	/**
	 * Whether to use compression for communications with elasticsearch.
	 */
	readonly compression: boolean;
	/**
	 * Hosts that the client will connect to. If sniffing is enabled, this list will
	 * be used as seeds to discover the rest of your cluster.
	 */
	readonly hosts: string[];
	/**
	 * List of Kibana client-side headers to send to Elasticsearch when request
	 * scoped cluster client is used. If this is an empty array then *no* client-side
	 * will be sent.
	 */
	readonly requestHeadersWhitelist: string[];
	/**
	 * Timeout after which HTTP request will be aborted and retried.
	 */
	readonly requestTimeout: Duration;
	/**
	 * Timeout for Elasticsearch to wait for responses from shards. Set to 0 to disable.
	 */
	readonly shardTimeout: Duration;
	/**
	 * Specifies whether the client should attempt to detect the rest of the cluster
	 * when it is first instantiated.
	 */
	readonly sniffOnStart: boolean;
	/**
	 * Interval to perform a sniff operation and make sure the list of nodes is complete.
	 * If `false` then sniffing is disabled.
	 */
	readonly sniffInterval: false | Duration;
	/**
	 * Specifies whether the client should immediately sniff for a more current list
	 * of nodes when a connection dies.
	 */
	readonly sniffOnConnectionFault: boolean;
	/**
	 * If Elasticsearch is protected with basic authentication, this setting provides
	 * the username that the Kibana server uses to perform its administrative functions.
	 * Cannot be used in conjunction with serviceAccountToken.
	 */
	readonly username?: string;
	/**
	 * If Elasticsearch is protected with basic authentication, this setting provides
	 * the password that the Kibana server uses to perform its administrative functions.
	 */
	readonly password?: string;
	/**
	 * If Elasticsearch security features are enabled, this setting provides the service account
	 * token that the Kibana server users to perform its administrative functions.
	 *
	 * This is an alternative to specifying a username and password.
	 */
	readonly serviceAccountToken?: string;
	/**
	 * Header names and values to send to Elasticsearch with every request. These
	 * headers cannot be overwritten by client-side headers and aren't affected by
	 * `requestHeadersWhitelist` configuration.
	 */
	readonly customHeaders: Record<string, string>;
	/**
	 * @internal
	 * Only valid in dev mode. Skip the valid connection check during startup. The connection check allows
	 * Kibana to ensure that the Elasticsearch connection is valid before allowing
	 * any other services to be set up.
	 *
	 * @remarks
	 * You should disable this check at your own risk: Other services in Kibana
	 * may fail if this step is not completed.
	 */
	readonly skipStartupConnectionCheck: boolean;
	/**
	 * Set of settings configure SSL connection between Kibana and Elasticsearch that
	 * are required when `xpack.ssl.verification_mode` in Elasticsearch is set to
	 * either `certificate` or `full`.
	 */
	readonly ssl: ElasticsearchSslConfig;
	/**
	 * Extends the list of APIs that should be redacted in logs.
	 */
	readonly apisToRedactInLogs: ElasticsearchApiToRedactInLogs[];
	/**
	 * The maximum time to retain the DNS lookup resolutions.
	 * Set to 0 to disable the cache (default Node.js behavior)
	 */
	readonly dnsCacheTtl: Duration;
}
interface IInterpreterRenderEvent<Context = unknown> {
	name: string;
	data?: Context;
}
interface IInterpreterRenderHandlers {
	/**
	 * Done increments the number of rendering successes
	 */
	done(): void;
	onDestroy(fn: () => void): void;
	reload(): void;
	update(params: IInterpreterRenderUpdateParams): void;
	event(event: IInterpreterRenderEvent): void;
	hasCompatibleActions?(event: IInterpreterRenderEvent): Promise<boolean>;
	getCompatibleCellValueActions?(data: object[]): Promise<unknown[]>;
	getRenderMode(): RenderMode;
	/**
	 * The chart is rendered in a non-interactive environment and should not provide any affordances for interaction like brushing.
	 */
	isInteractive(): boolean;
	isSyncColorsEnabled(): boolean;
	isSyncCursorEnabled(): boolean;
	isSyncTooltipsEnabled(): boolean;
	/**
	 * This uiState interface is actually `PersistedState` from the visualizations plugin,
	 * but expressions cannot know about vis or it creates a mess of circular dependencies.
	 * Downstream consumers of the uiState handler will need to cast for now.
	 */
	uiState?: unknown;
	getExecutionContext(): KibanaExecutionContext | undefined;
}
interface IInterpreterRenderUpdateParams<Params = unknown> {
	newExpression?: string | ExpressionAstExpression;
	newParams: Params;
}
interface IKibanaResponse<T extends HttpResponsePayload | ResponseError = any> {
	readonly status: number;
	readonly payload?: T;
	readonly options: HttpResponseOptions;
}
interface IKibanaSocket {
	getPeerCertificate(detailed: true): DetailedPeerCertificate | null;
	getPeerCertificate(detailed: false): PeerCertificate | null;
	/**
	 * Returns an object representing the peer's certificate.
	 * The returned object has some properties corresponding to the field of the certificate.
	 * If detailed argument is true the full chain with issuer property will be returned,
	 * if false only the top certificate without issuer property.
	 * If the peer does not provide a certificate, it returns null.
	 * @param detailed - If true; the full chain with issuer property will be returned.
	 * @returns An object representing the peer's certificate.
	 */
	getPeerCertificate(detailed?: boolean): PeerCertificate | DetailedPeerCertificate | null;
	/**
	 * Returns a string containing the negotiated SSL/TLS protocol version of the current connection. The value 'unknown' will be returned for
	 * connected sockets that have not completed the handshaking process. The value null will be returned for server sockets or disconnected
	 * client sockets. See https://www.openssl.org/docs/man1.0.2/ssl/SSL_get_version.html for more information.
	 */
	getProtocol(): string | null;
	/**
	 * Renegotiates a connection to obtain the peer's certificate. This cannot be used when the protocol version is TLSv1.3.
	 * @param options - The options may contain the following fields: rejectUnauthorized, requestCert (See tls.createServer() for details).
	 * @returns A Promise that will be resolved if renegotiation succeeded, or will be rejected if renegotiation failed.
	 */
	renegotiate(options: {
		rejectUnauthorized?: boolean;
		requestCert?: boolean;
	}): Promise<void>;
	/**
	 * Indicates whether or not the peer certificate was signed by one of the specified CAs. When TLS
	 * isn't used the value is `undefined`.
	 */
	readonly authorized?: boolean;
	/**
	 * The reason why the peer's certificate has not been verified. This property becomes available
	 * only when `authorized` is `false`.
	 */
	readonly authorizationError?: Error;
	/**
	 * The string representation of the remote IP address. For example,`'74.125.127.100'` or
	 * `'2001:4860:a005::68'`. Value may be `undefined` if the socket is destroyed (for example, if
	 * the client disconnected).
	 */
	readonly remoteAddress?: string;
}
interface IPricingTiersClient {
	/**
	 * Determines if a feature is available based on the current pricing tier configuration.
	 *
	 * @param featureId - The identifier of the feature to check
	 * @returns True if the feature is available in the current pricing tier, false otherwise
	 */
	isFeatureAvailable<TFeatureId extends string>(featureId: TFeatureId): boolean;
	/**
	 * @deprecated Don't rely on this API for customizing serverless tiers. Register a dedicated feature and use {@link IPricingTiersClient.isFeatureAvailable} instead.
	 */
	getActiveProduct(): PricingProduct | undefined;
}
interface IRegistry<T> {
	get(id: string): T | null;
	toJS(): Record<string, T>;
	toArray(): T[];
}
interface IRouter<Context extends RequestHandlerContextBase = RequestHandlerContextBase> {
	/**
	 * Resulted path
	 */
	routerPath: string;
	/**
	 * Register a route handler for `GET` request.
	 * @param route {@link RouteConfig} - a route configuration.
	 * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
	 *
	 * @track-adoption
	 */
	get: RouteRegistrar<"get", Context>;
	/**
	 * Register a route handler for `POST` request.
	 * @param route {@link RouteConfig} - a route configuration.
	 * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
	 *
	 * @track-adoption
	 */
	post: RouteRegistrar<"post", Context>;
	/**
	 * Register a route handler for `PUT` request.
	 * @param route {@link RouteConfig} - a route configuration.
	 * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
	 *
	 * @track-adoption
	 */
	put: RouteRegistrar<"put", Context>;
	/**
	 * Register a route handler for `PATCH` request.
	 * @param route {@link RouteConfig} - a route configuration.
	 * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
	 *
	 * @track-adoption
	 */
	patch: RouteRegistrar<"patch", Context>;
	/**
	 * Register a route handler for `DELETE` request.
	 * @param route {@link RouteConfig} - a route configuration.
	 * @param handler {@link RequestHandler} - a function to call to respond to an incoming request
	 *
	 * @track-adoption
	 */
	delete: RouteRegistrar<"delete", Context>;
	/**
	 * Wrap a router handler to catch and converts legacy boom errors to proper custom errors.
	 * @param handler {@link RequestHandler} - a route handler to wrap
	 */
	handleLegacyErrors: RequestHandlerWrapper;
	/**
	 * Returns all routes registered with this router.
	 * @returns List of registered routes.
	 * @internal
	 */
	getRoutes: (options?: {
		excludeVersionedRoutes?: boolean;
	}) => RouterRoute[];
	/**
	 * An instance very similar to {@link IRouter} that can be used for versioning HTTP routes
	 * following the Elastic versioning specification.
	 *
	 * @example
	 * const router = core.http.createRouter();
	 * router.versioned.get({ path: '/api/my-path', access: 'public' }).addVersion(
	 *   {
	 *     version: '1',
	 *     validate: false,
	 *   },
	 *   async (ctx, req, res) => {
	 *     return res.ok();
	 *   }
	 * );
	 *
	 * @experimental
	 */
	versioned: VersionedRouter<Context>;
}
interface ISavedObjectTypeRegistry {
	/**
	 * Return legacy types, this types can't be registered
	 */
	getLegacyTypes(): string[];
	/**
	 * Return the {@link SavedObjectsType | type} definition for given type name.
	 */
	getType(type: string): SavedObjectsType | undefined;
	/**
	 * Returns all visible {@link SavedObjectsType | types}.
	 *
	 * A visible type is a type that doesn't explicitly define `hidden=true` during registration.
	 */
	getVisibleTypes(): SavedObjectsType[];
	/**
	 * Returns all visible {@link SavedObjectsType | types} exposed to the global SO HTTP APIs
	 *
	 * A visibleToHttpApis type is a type that doesn't explicitly define `hidden=true` nor `hiddenFromHttpApis=true` during registration.
	 */
	getVisibleToHttpApisTypes(): SavedObjectsType[];
	/**
	 * Return all {@link SavedObjectsType | types} currently registered, including the hidden ones.
	 *
	 * To only get the visible types (which is the most common use case), use `getVisibleTypes` instead.
	 */
	getAllTypes(): SavedObjectsType[];
	/**
	 * Return all {@link SavedObjectsType | types} currently registered that are importable/exportable.
	 */
	getImportableAndExportableTypes(): SavedObjectsType[];
	/**
	 * Returns whether the type is namespace-agnostic (global);
	 * resolves to `false` if the type is not registered
	 */
	isNamespaceAgnostic(type: string): boolean;
	/**
	 * Returns whether the type is single-namespace (isolated);
	 * resolves to `true` if the type is not registered
	 */
	isSingleNamespace(type: string): boolean;
	/**
	 * Returns whether the type is multi-namespace (shareable *or* isolated);
	 * resolves to `false` if the type is not registered
	 */
	isMultiNamespace(type: string): boolean;
	/**
	 * Returns whether the type is multi-namespace (shareable);
	 * resolves to `false` if the type is not registered
	 */
	isShareable(type: string): boolean;
	/**
	 * Returns the `hidden` property for given type, or `false` if
	 * the type is not registered.
	 */
	isHidden(type: string): boolean;
	/**
	 * Returns the `hiddenFromHttpApis` property for a given type, or `false` if
	 * the type is not registered
	 */
	isHiddenFromHttpApis(type: string): boolean;
	/**
	 * Returns the `indexPattern` property for given type, or `undefined` if
	 * the type is not registered.
	 */
	getIndex(type: string): string | undefined;
	/**
	 * Returns the `management.importableAndExportable` property for given type, or
	 * `false` if the type is not registered or does not define a management section.
	 */
	isImportableAndExportable(type: string): boolean;
	/**
	 * Returns the `nameAttribute` property for given type, or `unknown` if
	 * the property/type is not registered.
	 */
	getNameAttribute(type: string): string;
	/**
	 * Returns whether the type supports access control.
	 */
	supportsAccessControl(type: string): boolean;
}
interface ISavedObjectsEncryptionExtension {
	/**
	 * Returns true if a type has been registered as encryptable.
	 * @param type - the string name of the object type
	 * @returns boolean, true if type is encryptable
	 */
	isEncryptableType: (type: string) => boolean;
	/**
	 * Returns false if ESO type explicitly opts out of highly random UID
	 *
	 * @param type the string name of the object type
	 * @returns boolean, true by default unless explicitly set to false
	 */
	shouldEnforceRandomId: (type: string) => boolean;
	/**
	 * Given a saved object, will return a decrypted saved object or will strip
	 * attributes from the returned object if decryption fails.
	 * @param response - any object R that extends SavedObject with attributes T
	 * @param originalAttributes - optional, original attributes T from when the object was created (NOT encrypted).
	 * These are used to avoid decryption execution cost if they are supplied.
	 * @returns R with decrypted or stripped attributes
	 */
	decryptOrStripResponseAttributes: <T, R extends SavedObject<T>>(response: R, originalAttributes?: T) => Promise<R>;
	/**
	 * Given a saved object descriptor and some attributes, returns an encrypted version
	 * of supplied attributes.
	 * @param descriptor - an object containing a saved object id, type, and optional namespace.
	 * @param attributes - T, attributes of the specified object, some of which to be encrypted.
	 * @returns T, encrypted attributes
	 */
	encryptAttributes: <T extends Record<string, unknown>>(descriptor: EncryptedObjectDescriptor, attributes: T) => Promise<T>;
}
interface ISavedObjectsExporter {
	/**
	 * Generates an export stream for given types.
	 *
	 * See the {@link SavedObjectsExportByTypeOptions | options} for more detailed information.
	 *
	 * @throws SavedObjectsExportError
	 */
	exportByTypes(options: SavedObjectsExportByTypeOptions): Promise<Stream.Readable>;
	/**
	 * Generates an export stream for given object references.
	 *
	 * See the {@link SavedObjectsExportByObjectOptions | options} for more detailed information.
	 *
	 * @throws SavedObjectsExportError
	 */
	exportByObjects(options: SavedObjectsExportByObjectOptions): Promise<Stream.Readable>;
}
interface ISavedObjectsImporter {
	/**
	 * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
	 * detailed information.
	 *
	 * @throws SavedObjectsImportError
	 */
	import(options: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse>;
	/**
	 * Resolve and return saved object import errors.
	 * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
	 *
	 * @throws SavedObjectsImportError
	 */
	resolveImportErrors(options: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse>;
}
interface ISavedObjectsPointInTimeFinder<T, A> {
	/**
	 * An async generator which wraps calls to `savedObjectsClient.find` and
	 * iterates over multiple pages of results using `_pit` and `search_after`.
	 * This will open a new Point-In-Time (PIT), and continue paging until a set
	 * of results is received that's smaller than the designated `perPage` size.
	 */
	find: () => AsyncGenerator<SavedObjectsFindResponse<T, A>>;
	/**
	 * Closes the Point-In-Time associated with this finder instance.
	 *
	 * Once you have retrieved all of the results you need, it is recommended
	 * to call `close()` to clean up the PIT and prevent Elasticsearch from
	 * consuming resources unnecessarily. This is only required if you are
	 * done iterating and have not yet paged through all of the results: the
	 * PIT will automatically be closed for you once you reach the last page
	 * of results, or if the underlying call to `find` fails for any reason.
	 */
	close: () => Promise<void>;
}
interface ISavedObjectsRepository {
	/**
	 * Persists an object
	 *
	 * @param {string} type - the type of object to create
	 * @param {object} attributes - the attributes for the object to be created
	 * @param {object} [options={}] {@link SavedObjectsCreateOptions} - options for the create operation
	 * @property {string} [options.id] - force id on creation, not recommended
	 * @property {boolean} [options.overwrite=false]
	 * @property {string} [options.namespace]
	 * @property {array} [options.references=[]] - [{ name, type, id }]
	 * @property {string} [options.migrationVersionCompatibility]
	 * @returns {promise} the created saved object { id, type, version, attributes }
	 */
	create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions): Promise<SavedObject$1<T>>;
	/**
	 * Creates multiple documents at once
	 *
	 * @param {array} objects - array of objects to create [{ type, attributes, ... }]
	 * @param {object} [options={}] {@link SavedObjectsCreateOptions} - options for the bulk create operation
	 * @property {boolean} [options.overwrite=false] - overwrites existing documents
	 * @property {string} [options.namespace]
	 * @property {string} [options.migrationVersionCompatibility]
	 * @returns {promise} - {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
	 */
	bulkCreate<T = unknown>(objects: Array<SavedObjectsBulkCreateObject<T>>, options?: SavedObjectsCreateOptions): Promise<SavedObjectsBulkResponse<T>>;
	/**
	 * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
	 * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
	 *
	 * @param {array} objects - array of objects to check for conflicts [{ id, type }]
	 * @param {object} options {@link SavedObjectsBaseOptions} - options for the check conflict operation
	 * @returns {promise} -  {errors: [{ id, type, error: { message } }]}
	 */
	checkConflicts(objects: SavedObjectsCheckConflictsObject[], options?: SavedObjectsBaseOptions): Promise<SavedObjectsCheckConflictsResponse>;
	/**
	 * Deletes an object
	 *
	 * @param {string} type - the type of the object to delete
	 * @param {string} id - the id of the object to delete
	 * @param {object} [options={}] {@link SavedObjectsDeleteOptions} - options for the delete operation
	 * @property {string} [options.namespace]
	 */
	delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;
	/**
	 * Deletes multiple documents at once
	 * @param {array} objects - an array of objects to delete (contains id and type)
	 * @param {object} [options={}] {@link SavedObjectsBulkDeleteOptions} - options for the bulk delete operation
	 * @returns {promise} - { statuses: [{ id, type, success, error: { message } }] }
	 */
	bulkDelete(objects: SavedObjectsBulkDeleteObject[], options?: SavedObjectsBulkDeleteOptions): Promise<SavedObjectsBulkDeleteResponse>;
	/**
	 * Deletes all objects from the provided namespace.
	 *
	 * @param {string} namespace - the namespace in which to delete all objects
	 * @param {object} options {@link SavedObjectsDeleteByNamespaceOptions} - options for the delete by namespace operation
	 * @returns {promise} - { took, timed_out, total, deleted, batches, version_conflicts, noops, retries, failures }
	 */
	deleteByNamespace(namespace: string, options?: SavedObjectsDeleteByNamespaceOptions): Promise<any>;
	/**
	 * Find saved objects by query
	 *
	 * @param {object} [options={}] {@link SavedObjectsFindOptions} - options for the find operation
	 * @property {(string|Array<string>)} [options.type]
	 * @property {string} [options.search]
	 * @property {string} [options.defaultSearchOperator]
	 * @property {Array<string>} [options.searchFields] - see Elasticsearch Simple Query String
	 *                                        Query field argument for more information
	 * @property {integer} [options.page=1]
	 * @property {integer} [options.perPage=20]
	 * @property {Array<unknown>} [options.searchAfter]
	 * @property {string} [options.sortField]
	 * @property {string} [options.sortOrder]
	 * @property {Array<string>} [options.fields]
	 * @property {string} [options.namespace]
	 * @property {object} [options.hasReference] - { type, id }
	 * @property {string} [options.pit]
	 * @property {string} [options.preference]
	 * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal-only options for the find operation
	 * @returns {promise} - { saved_objects: [{ id, type, version, attributes }], total, per_page, page }
	 */
	find<T = unknown, A = unknown>(options: SavedObjectsFindOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsFindResponse<T, A>>;
	/**
	 * Performs a raw search against the saved objects indices, returning the raw Elasticsearch response
	 * @param options {@link SavedObjectsSearchOptions} - options for the search operation
	 * @returns the {@link SavedObjectsSearchResponse}
	 *
	 * @remarks While the `search` method is powerful, it can increase code complexity, introduce performance issues and introduce security risks (like injection attacks). Take care to ensure it is implemented correctly for your use case and appropriately stress tested. Carefully consider how you would like to use this method in your plugin to unlock value for users.
	 * @remarks See tutorial https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects-search
	 */
	search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(options: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse<T, A>>;
	/**
	 * Returns an array of objects by id
	 *
	 * @param {array} objects - an array of objects containing id, type and optionally fields
	 * @param {object} [options={}] {@link SavedObjectsGetOptions} - options for the bulk get operation
	 * @property {string} [options.migrationVersionCompatibility]
	 * @property {string} [options.namespace]
	 * @returns {promise} - { saved_objects: [{ id, type, version, attributes }] }
	 * @example
	 *
	 * bulkGet([
	 *   { id: 'one', type: 'config' },
	 *   { id: 'foo', type: 'index-pattern' }
	 * ])
	 */
	bulkGet<T = unknown>(objects: SavedObjectsBulkGetObject[], options?: SavedObjectsGetOptions): Promise<SavedObjectsBulkResponse<T>>;
	/**
	 * Resolves an array of objects by id, using any legacy URL aliases if they exist
	 *
	 * @param {array} objects - an array of objects containing id, type
	 * @param {object} [options={}] {@link SavedObjectsResolveOptions} - options for the bulk resolve operation
	 * @property {string} [options.migrationVersionCompatibility]
	 * @property {string} [options.namespace]
	 * @returns {promise} - { resolved_objects: [{ saved_object, outcome }] }
	 * @example
	 *
	 * bulkResolve([
	 *   { id: 'one', type: 'config' },
	 *   { id: 'foo', type: 'index-pattern' }
	 * ])
	 */
	bulkResolve<T = unknown>(objects: SavedObjectsBulkResolveObject[], options?: SavedObjectsResolveOptions): Promise<SavedObjectsBulkResolveResponse<T>>;
	/**
	 * Gets a single object
	 *
	 * @param {string} type - the type of the object to get
	 * @param {string} id - the ID of the object to get
	 * @param {object} [options={}] {@link SavedObjectsGetOptions} - options for the get operation
	 * @property {string} [options.migrationVersionCompatibility]
	 * @property {string} [options.namespace]
	 * @returns {promise} - { id, type, version, attributes }
	 */
	get<T = unknown>(type: string, id: string, options?: SavedObjectsGetOptions): Promise<SavedObject$1<T>>;
	/**
	 * Resolves a single object, using any legacy URL alias if it exists
	 *
	 * @param {string} type - the type of the object to resolve
	 * @param {string} id - the id of the object to resolve
	 * @param {object} [options={}] {@link SavedObjectsResolveOptions} - options for the resolve operation
	 * @property {string} [options.migrationVersionCompatibility]
	 * @property {string} [options.namespace]
	 * @returns {promise} - { saved_object, outcome }
	 */
	resolve<T = unknown>(type: string, id: string, options?: SavedObjectsResolveOptions): Promise<SavedObjectsResolveResponse<T>>;
	/**
	 * Updates an object
	 *
	 * @param {string} type - the type of the object to update
	 * @param {string} id - the ID of the object to update
	 * @param {object} attributes - attributes to update
	 * @param {object} [options={}] {@link SavedObjectsUpdateOptions} - options for the update operation
	 * @property {string} options.version - ensures version matches that of persisted object
	 * @property {string} [options.namespace]
	 * @property {array} [options.references] - [{ name, type, id }]
	 * @returns {promise} - updated saved object
	 */
	update<T = unknown>(type: string, id: string, attributes: Partial<T>, options?: SavedObjectsUpdateOptions<T>): Promise<SavedObjectsUpdateResponse<T>>;
	/**
	 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
	 * type.
	 *
	 * @param {array} objects - The objects to get the references for (contains type and ID)
	 * @param {object} options {@link SavedObjectsCollectMultiNamespaceReferencesOptions} - the options for the operation
	 * @returns {promise} - {@link SavedObjectsCollectMultiNamespaceReferencesResponse} { objects: [{ type, id, spaces, inboundReferences, ... }] }
	 */
	collectMultiNamespaceReferences(objects: SavedObjectsCollectMultiNamespaceReferencesObject[], options?: SavedObjectsCollectMultiNamespaceReferencesOptions): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
	/**
	 * Updates one or more objects to add and/or remove them from specified spaces.
	 *
	 * @param {array} objects - array of objects to update (contains type, ID, and optional parameters)
	 * @param {array} spacesToAdd - array of spaces in which the objects should be added
	 * @param {array} spacesToRemove - array of spaces from which the objects should be removed
	 * @param {object} options {@link SavedObjectsUpdateObjectsSpacesOptions} - options for the operation
	 * @returns {promise} - { objects: [{ id, type, spaces, error: { message } }] }
	 */
	updateObjectsSpaces(objects: SavedObjectsUpdateObjectsSpacesObject[], spacesToAdd: string[], spacesToRemove: string[], options?: SavedObjectsUpdateObjectsSpacesOptions): Promise<SavedObjectsUpdateObjectsSpacesResponse>;
	/**
	 * Updates multiple objects in bulk
	 *
	 * @param {array} objects - array of objects to update (contains type, id, attributes, options: { version, namespace } references)
	 * @param {object} options {@link SavedObjectsBulkUpdateOptions} - options for the bulk update operation
	 * @property {string} options.version - ensures version matches that of persisted object
	 * @property {string} [options.namespace]
	 * @returns {promise} -  {saved_objects: [[{ id, type, version, references, attributes, error: { message } }]}
	 */
	bulkUpdate<T = unknown>(objects: Array<SavedObjectsBulkUpdateObject<T>>, options?: SavedObjectsBulkUpdateOptions): Promise<SavedObjectsBulkUpdateResponse<T>>;
	/**
	 * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
	 *
	 * @remarks
	 * Will throw a conflict error if the `update_by_query` operation returns any failure. In that case some
	 * references might have been removed, and some were not. It is the caller's responsibility to handle and fix
	 * this situation if it was to happen.
	 *
	 * Intended use is to provide clean up of any references to an object which is being deleted (e.g. deleting
	 * a tag). See discussion here: https://github.com/elastic/kibana/issues/135259#issuecomment-1482515139
	 *
	 * When security is enabled, authorization for this method is based only on authorization to delete the object
	 * represented by the {type, id} tuple. Therefore it is recommended only to call this method for the intended
	 * use case.
	 *
	 * @param {string} type - the type of the object to remove references to
	 * @param {string} id - the ID of the object to remove references to
	 * @param {object} options {@link SavedObjectsRemoveReferencesToOptions} - options for the remove references operation
	 * @returns {promise} - { number - the number of objects that have been updated by this operation }
	 */
	removeReferencesTo(type: string, id: string, options?: SavedObjectsRemoveReferencesToOptions): Promise<SavedObjectsRemoveReferencesToResponse>;
	/**
	 * Increments all the specified counter fields (by one by default). Creates the document
	 * if one doesn't exist for the given id.
	 *
	 * @remarks
	 * When supplying a field name like `stats.api.counter` the field name will
	 * be used as-is to create a document like:
	 *   `{attributes: {'stats.api.counter': 1}}`
	 * It will not create a nested structure like:
	 *   `{attributes: {stats: {api: {counter: 1}}}}`
	 *
	 * When using incrementCounter you need to ensure
	 * that usage collection happens on a best-effort basis and doesn't
	 * negatively affect your plugin or users. See https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/usage_collection/README.mdx#tracking-interactions-with-incrementcounter)
	 *
	 * @example
	 * ```ts
	 * const repository = coreStart.savedObjects.createInternalRepository();
	 *
	 * // Initialize all fields to 0
	 * repository
	 *   .incrementCounter('dashboard_counter_type', 'counter_id', [
	 *     'stats.apiCalls',
	 *     'stats.sampleDataInstalled',
	 *   ], {initialize: true});
	 *
	 * // Increment the apiCalls field counter
	 * repository
	 *   .incrementCounter('dashboard_counter_type', 'counter_id', [
	 *     'stats.apiCalls',
	 *   ])
	 *
	 * // Increment the apiCalls field counter by 4
	 * repository
	 *   .incrementCounter('dashboard_counter_type', 'counter_id', [
	 *     { fieldName: 'stats.apiCalls' incrementBy: 4 },
	 *   ])
	 *
	 * // Initialize the document with arbitrary fields if not present
	 * repository.incrementCounter<{ appId: string }>(
	 *   'dashboard_counter_type',
	 *   'counter_id',
	 *   [ 'stats.apiCalls'],
	 *   { upsertAttributes: { appId: 'myId' } }
	 * )
	 * ```
	 *
	 * @param {string} type - The type of saved object whose fields should be incremented
	 * @param {string} id - The id of the document whose fields should be incremented
	 * @param {array} counterFields - An array of field names to increment or an array of {@link SavedObjectsIncrementCounterField}
	 * @param {object} options {@link SavedObjectsIncrementCounterOptions}
	 * @returns {promise} - The saved object after the specified fields were incremented
	 */
	incrementCounter<T = unknown>(type: string, id: string, counterFields: Array<string | SavedObjectsIncrementCounterField>, options?: SavedObjectsIncrementCounterOptions<T>): Promise<SavedObject$1<T>>;
	/**
	 * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
	 * The returned `id` can then be passed to `SavedObjects.find` to search against that PIT.
	 *
	 * Only use this API if you have an advanced use case that's not solved by the
	 * {@link SavedObjectsRepository.createPointInTimeFinder} method.
	 *
	 * @example
	 * ```ts
	 * const { id } = await savedObjectsClient.openPointInTimeForType(
	 *   type: 'visualization',
	 *   { keepAlive: '5m' },
	 * );
	 * const page1 = await savedObjectsClient.find({
	 *   type: 'visualization',
	 *   sortField: 'updated_at',
	 *   sortOrder: 'asc',
	 *   pit: { id, keepAlive: '2m' },
	 * });
	 * const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
	 * const page2 = await savedObjectsClient.find({
	 *   type: 'visualization',
	 *   sortField: 'updated_at',
	 *   sortOrder: 'asc',
	 *   pit: { id: page1.pit_id },
	 *   searchAfter: lastHit.sort,
	 * });
	 * await savedObjectsClient.closePointInTime(page2.pit_id);
	 * ```
	 *
	 * @param {string|Array<string>} type - the type or types for the PIT
	 * @param {object} [options] {@link SavedObjectsOpenPointInTimeOptions} - options for the open PIT operation
	 * @property {string} [options.keepAlive]
	 * @property {string} [options.preference]
	 * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal options for the open PIT operation
	 * @returns {promise} - { id - the ID for the PIT }
	 */
	openPointInTimeForType(type: string | string[], options?: SavedObjectsOpenPointInTimeOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsOpenPointInTimeResponse>;
	/**
	 * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES
	 * via the Elasticsearch client, and is included in the Saved Objects Client
	 * as a convenience for consumers who are using `openPointInTimeForType`.
	 *
	 * Only use this API if you have an advanced use case that's not solved by the
	 * {@link SavedObjectsRepository.createPointInTimeFinder} method.
	 *
	 * @remarks
	 * While the `keepAlive` that is provided will cause a PIT to automatically close,
	 * it is highly recommended to explicitly close a PIT when you are done with it
	 * in order to avoid consuming unneeded resources in Elasticsearch.
	 *
	 * @example
	 * ```ts
	 * const repository = coreStart.savedObjects.createInternalRepository();
	 *
	 * const { id } = await repository.openPointInTimeForType(
	 *   type: 'index-pattern',
	 *   { keepAlive: '2m' },
	 * );
	 *
	 * const response = await repository.find({
	 *   type: 'index-pattern',
	 *   search: 'foo*',
	 *   sortField: 'name',
	 *   sortOrder: 'desc',
	 *   pit: {
	 *     id: 'abc123',
	 *     keepAlive: '2m',
	 *   },
	 *   searchAfter: [1234, 'abcd'],
	 * });
	 *
	 * await repository.closePointInTime(response.pit_id);
	 * ```
	 *
	 * @param {string} id - ID of the saved object
	 * @param {object} [options] {@link SavedObjectsClosePointInTimeOptions} - options for the close PIT operation
	 * @param {object} internalOptions {@link SavedObjectsFindInternalOptions} - internal options for the close PIT operation
	 * @returns {promise} - { succeeded, num_freed - number of contexts closed }
	 */
	closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsClosePointInTimeResponse>;
	/**
	 * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
	 * large sets of saved objects. We strongly recommend using this API for
	 * any `find` queries that might return more than 1000 saved objects,
	 * however this API is only intended for use in server-side "batch"
	 * processing of objects where you are collecting all objects in memory
	 * or streaming them back to the client.
	 *
	 * Do NOT use this API in a route handler to facilitate paging through
	 * saved objects on the client-side unless you are streaming all of the
	 * results back to the client at once. Because the returned generator is
	 * stateful, you cannot rely on subsequent http requests retrieving new
	 * pages from the same Kibana server in multi-instance deployments.
	 *
	 * This generator wraps calls to {@link SavedObjectsRepository.find} and
	 * iterates over multiple pages of results using `_pit` and `search_after`.
	 * This will open a new Point-In-Time (PIT), and continue paging until a
	 * set of results is received that's smaller than the designated `perPage`.
	 *
	 * Once you have retrieved all of the results you need, it is recommended
	 * to call `close()` to clean up the PIT and prevent Elasticsearch from
	 * consuming resources unnecessarily. This is only required if you are
	 * done iterating and have not yet paged through all of the results: the
	 * PIT will automatically be closed for you once you reach the last page
	 * of results, or if the underlying call to `find` fails for any reason.
	 *
	 * @param {object} findOptions - {@link SavedObjectsCreatePointInTimeFinderOptions} - the options for creating the point-in-time finder
	 * @param {object} dependencies - {@link SavedObjectsCreatePointInTimeFinderDependencies} - the dependencies for creating the point-in-time finder
	 * @returns - the point-in-time finder {@link ISavedObjectsPointInTimeFinder}
	 *
	 * @example
	 * ```ts
	 * const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
	 *   type: 'visualization',
	 *   search: 'foo*',
	 *   perPage: 100,
	 * };
	 *
	 * const finder = savedObjectsClient.createPointInTimeFinder(findOptions);
	 *
	 * const responses: SavedObjectFindResponse[] = [];
	 * for await (const response of finder.find()) {
	 *   responses.push(...response);
	 *   if (doneSearching) {
	 *     await finder.close();
	 *   }
	 * }
	 * ```
	 */
	createPointInTimeFinder<T = unknown, A = unknown>(findOptions: SavedObjectsCreatePointInTimeFinderOptions, dependencies?: SavedObjectsCreatePointInTimeFinderDependencies): ISavedObjectsPointInTimeFinder<T, A>;
	/**
	 * If the spaces extension is enabled, it's used to get the current namespace (and optionally throws an error if a
	 * consumer attempted to specify the namespace explicitly).
	 *
	 * If the spaces extension is *not* enabled, this function simply normalizes the specified namespace so that
	 * `'default'` can be used interchangeably with `undefined` i.e. the method always returns `undefined` for the default
	 * namespace.
	 */
	getCurrentNamespace(namespace?: string): string | undefined;
	/**
	 * Returns a new Saved Objects repository scoped to the specified namespace.
	 * @param namespace Space to which the repository should be scoped to.
	 */
	asScopedToNamespace(namespace: string): ISavedObjectsRepository;
	/**
	 * Changes the ownership of one or more SavedObjects to a new owner.
	 *
	 * @param objects {@link SavedObjectsChangeAccessControlObject} - the objects to update
	 * @param options {@link SavedObjectsChangeOwnershipOptions} - object containing owner profile_uid that will be the new owner
	 * @returns the {@link SavedObjectsChangeAccessControlResponse}
	 */
	changeOwnership(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeOwnershipOptions): Promise<SavedObjectsChangeAccessControlResponse>;
	/**
	 * Changes the access mode of one or more SavedObjects to a new access mode.
	 *
	 * @param objects {@link SavedObjectsChangeAccessControlObject} - the objects to update
	 * @param options {@link SavedObjectsChangeAccessControlOptions} - object containing access mode. If empty, is considered to be marked as editable
	 */
	changeAccessMode(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeAccessModeOptions): Promise<SavedObjectsChangeAccessControlResponse>;
}
interface ISavedObjectsSecurityExtension {
	/**
	 * Performs authorization for the CREATE security action
	 * @param params the namespace and object to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeCreate: <A extends string>(params: AuthorizeCreateParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the BULK_CREATE security action
	 * @param params the namespace and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeBulkCreate: <A extends string>(params: AuthorizeBulkCreateParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the UPDATE security action
	 * @param params the namespace and object to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeUpdate: <A extends string>(params: AuthorizeUpdateParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the BULK_UPDATE security action
	 * @param params the namespace and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeBulkUpdate: <A extends string>(params: AuthorizeBulkUpdateParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the DELETE security action
	 * @param params the namespace and object to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeDelete: <A extends string>(params: AuthorizeDeleteParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the BULK_DELETE security action
	 * @param params the namespace and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeBulkDelete: <A extends string>(params: AuthorizeBulkDeleteParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the GET security action
	 * @param params the namespace, object to authorize, and whether or not the object was found
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeGet: <A extends string>(params: AuthorizeGetParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the BULK_GET security action
	 * @param params the namespace and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeBulkGet: <A extends string>(params: AuthorizeBulkGetParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the CHECK_CONFLICTS security action
	 * @param params the namespace and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeCheckConflicts: <A extends string>(params: AuthorizeCheckConflictsParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the REMOVE_REFERENCES security action. Checks for authorization
	 * to delete the object to which references are to be removed. In reality, the operation is an
	 * UPDATE to all objects that reference the given object, but the intended use for the
	 * removeReferencesTo method is to clean up any references to an object which is being deleted
	 * (e.g. deleting a tag).
	 * See discussion here: https://github.com/elastic/kibana/issues/135259#issuecomment-1482515139
	 * @param params the namespace and object to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeRemoveReferences: <A extends string>(params: AuthorizeDeleteParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the OPEN_POINT_IN_TIME security action
	 * @param params the namespaces and types to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeOpenPointInTime: <A extends string>(params: AuthorizeOpenPointInTimeParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the CHANGE_OWNERSHIP or CHANGE_ACCESS_MODE security actions
	 * @param params the namespace and object to authorize for changing ownership
	 * @param operation the operation to authorize - one of 'changeAccessMode' or 'changeOwnership'
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeChangeAccessControl: <A extends string>(params: AuthorizeChangeAccessControlParams, operation: "changeAccessMode" | "changeOwnership") => Promise<AuthorizationResult<A>>;
	/**
	 * Performs audit logging for the CLOSE_POINT_IN_TIME security action
	 */
	auditClosePointInTime: () => void;
	/**
	 * Handles all security operations for the COLLECT_MULTINAMESPACE_REFERENCES security action
	 * Checks/enforces authorization, writes audit events, filters the object graph, and redacts spaces from the share_to_space/bulk_get
	 * response. In other SavedObjectsRepository functions we do this before decrypting attributes. However, because of the
	 * share_to_space/bulk_get response logic involved in deciding between the exact match or alias match, it's cleaner to do authorization,
	 * auditing, filtering, and redaction all afterwards.
	 * @param params - the namespace, objects to authorize, and purpose of the operation
	 * @returns SavedObjectReferenceWithContext[] - array of collected references
	 */
	authorizeAndRedactMultiNamespaceReferences: (params: AuthorizeAndRedactMultiNamespaceReferencesParams) => Promise<SavedObjectReferenceWithContext[]>;
	/**
	 * Handles all security operations for the INTERNAL_BULK_RESOLVE security action
	 * Checks authorization, writes audit events, and redacts namespaces from the bulkResolve response. In other SavedObjectsRepository
	 * functions we do this before decrypting attributes. However, because of the bulkResolve logic involved in deciding between the exact match
	 * or alias match, it's cleaner to do authorization, auditing, and redaction all afterwards.
	 * @param params - the namespace and objects to authorize
	 * @returns Array of SavedObjectsResolveResponses or BulkResolveErrors - the redacted resolve responses or errors
	 */
	authorizeAndRedactInternalBulkResolve: <T = unknown>(params: AuthorizeAndRedactInternalBulkResolveParams<T>) => Promise<Array<SavedObjectsResolveResponse<T> | BulkResolveError>>;
	/**
	 * Performs authorization for the UPDATE_OBJECTS_SPACES security action
	 * @param params - namespace, spacesToAdd, spacesToRemove, and objects to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeUpdateSpaces: <A extends string>(params: AuthorizeUpdateSpacesParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Performs authorization for the FIND security action
	 * This method is the first of two security steps for the find operation (saved objects repository's find method)
	 * This method should be called first in order to provide data needed to construct the type-to-namespace map for the search DSL
	 * @param params - namespaces and types to authorize
	 * @returns AuthorizationResult - the resulting authorization level and authorization map
	 */
	authorizeFind: <A extends string>(params: AuthorizeFindParams) => Promise<AuthorizationResult<A>>;
	/**
	 * Gets an updated type map for redacting results of the FIND security action
	 * This method is the second of two security steps for the find operation (saved objects repository's find method)
	 * This method should be called last in order to update the type map used to redact namespaces in the results
	 * @param params - namespace, spacesToAdd, spacesToRemove, and objects to authorize
	 * @returns - the updated type map used for redaction
	 */
	getFindRedactTypeMap: <A extends string>(params: GetFindRedactTypeMapParams) => Promise<AuthorizationTypeMap<A> | undefined>;
	/**
	 * Filters a saved object's spaces based on an authorization map (from CheckAuthorizationResult)
	 * @param params - the saved object and an authorization map
	 * @returns SavedObject - saved object with filtered spaces
	 */
	redactNamespaces: <T, A extends string>(params: RedactNamespacesParams<T, A>) => SavedObject<T>;
	/**
	 * Performs authorization for the disableLegacyUrlAliases method of the SecureSpacesClientWrapper
	 * There is no return for this method. If unauthorized the method with throw, otherwise will resolve.
	 * @param aliases - array of legacy url alias targets
	 */
	authorizeDisableLegacyUrlAliases: (aliases: LegacyUrlAliasTarget[]) => void;
	/**
	 * Performs saved object audit logging for the delete method of the SecureSpacesClientWrapper
	 * @param spaceId - the id of the space being deleted
	 * @param objects - the objects to audit
	 */
	auditObjectsForSpaceDeletion: <T = unknown>(spaceId: string, objects: Array<SavedObjectsFindResult<T>>) => void;
	/**
	 * Retrieves the current user from the request context if available
	 */
	getCurrentUser: () => AuthenticatedUser | null;
	/**
	 * Retrieves whether we need to include save objects names in the audit out
	 */
	includeSavedObjectNames: () => boolean;
	/**
	 * Filters bulk operation expected results array to filter inaccessible object left
	 */
	filterInaccessibleObjectsForBulkAction<L extends {
		type: string;
		id?: string;
		error: Payload;
	}, R extends {
		type: string;
		id: string;
		esRequestIndex?: number;
	}>(expectedResults: Array<Either<L, R>>, inaccessibleObjects: Array<{
		type: string;
		id: string;
	}>, action: "bulk_create" | "bulk_update" | "bulk_delete", // could alternatively move the SecurityAction definition to a core package to reference here
	reindex?: boolean): Promise<Array<Either<L, R>>>;
}
interface ISavedObjectsSerializer {
	/**
	 * Determines whether the raw document can be converted to a saved object.
	 *
	 * @param {SavedObjectsRawDoc} doc - The raw ES document to be tested
	 * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
	 */
	isRawSavedObject(doc: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): boolean;
	/**
	 * Converts a document from the format that is stored in elasticsearch to the saved object client format.
	 *
	 * @param {SavedObjectsRawDoc} doc - The raw ES document to be converted to saved object format.
	 * @param {SavedObjectsRawDocParseOptions} options - Options for parsing the raw document.
	 */
	rawToSavedObject<T = unknown>(doc: SavedObjectsRawDoc, options?: SavedObjectsRawDocParseOptions): SavedObjectSanitizedDoc<T>;
	/**
	 * Converts a document from the saved object client format to the format that is stored in elasticsearch.
	 *
	 * @param {SavedObjectSanitizedDoc} savedObj - The saved object to be converted to raw ES format.
	 */
	savedObjectToRaw(savedObj: SavedObjectSanitizedDoc): SavedObjectsRawDoc;
	/**
	 * Given a saved object type and id, generates the compound id that is stored in the raw document.
	 *
	 * @param {string} namespace - The namespace of the saved object
	 * @param {string} type - The saved object type
	 * @param {string} id - The id of the saved object
	 */
	generateRawId(namespace: string | undefined, type: string, id: string): string;
	/**
	 * Given a saved object type and id, generates the compound id that is stored in the raw document for its legacy URL alias.
	 *
	 * @param {string} namespace - The namespace of the saved object
	 * @param {string} type - The saved object type
	 * @param {string} id - The id of the saved object
	 */
	generateRawLegacyUrlAliasId(namespace: string | undefined, type: string, id: string): string;
}
interface ISavedObjectsSpacesExtension {
	/**
	 * Retrieves the active namespace ID. This is *not* the same as a namespace string. See also: `namespaceIdToString` and
	 * `namespaceStringToId`.
	 *
	 * This takes the saved objects repository's namespace option as a parameter, and doubles as a validation function; if the namespace
	 * option has already been set some other way, this will throw an error.
	 */
	getCurrentNamespace: (namespace: string | undefined) => string | undefined;
	/**
	 * Given a list of namespace strings, returns a subset that the user is authorized to search in.
	 * If a wildcard '*' is used, it is expanded to an explicit list of namespace strings.
	 */
	getSearchableNamespaces: (namespaces: string[] | undefined) => Promise<string[]>;
	/**
	 * Returns a new Saved Objects Spaces Extension scoped to the specified namespace.
	 * @param namespace Space to which the extension should be scoped to.
	 */
	asScopedToNamespace(namespace: string): ISavedObjectsSpacesExtension;
}
interface IScopedClusterClient {
	/**
	 * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
	 * on behalf of the internal Kibana user.
	 */
	readonly asInternalUser: ElasticsearchClient;
	/**
	 * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
	 * with the internal Kibana user as primary auth and the current user as secondary auth
	 * (using the `es-secondary-authorization` header).
	 *
	 * Note that only a subset of Elasticsearch APIs support secondary authentication, and that only those endpoints
	 * should be called with this client.
	 */
	readonly asSecondaryAuthUser: ElasticsearchClient;
	/**
	 * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
	 * on behalf of the user that initiated the request to the Kibana server.
	 */
	readonly asCurrentUser: ElasticsearchClient;
}
interface IStaticAssets {
	/**
	 * Gets the full href to the current plugin's asset,
	 * given its path relative to the plugin's `public/assets` folder.
	 *
	 * @example
	 * ```ts
	 * // I want to retrieve the href for the asset stored under `my_plugin/public/assets/some_folder/asset.png`:
	 * const assetHref = core.http.statisAssets.getPluginAssetHref('some_folder/asset.png');
	 * ```
	 */
	getPluginAssetHref(assetPath: string): string;
	/**
	 * Will return an href, either a path for or full URL with the provided path
	 * appended to the static assets public base path.
	 *
	 * Useful for instances were you need to render your own HTML page and link to
	 * certain static assets.
	 *
	 * @example
	 * ```ts
	 * // I want to retrieve the href for Kibana's favicon, requires knowledge of path:
	 * const favIconHref = core.http.statisAssets.prependPublicUrl('/ui/favicons/favicon.svg');
	 * ```
	 *
	 * @note Only use this if you know what you are doing and there is no other option.
	 *       This creates a strong coupling between asset dir structure and your code.
	 * @param pathname
	 */
	prependPublicUrl(pathname: string): string;
}
interface IUiSettingsClient {
	/**
	 * Returns registered uiSettings values {@link UiSettingsParams}
	 */
	getRegistered: () => Readonly<Record<string, Omit<UiSettingsParams, "schema">>>;
	/**
	 * Retrieves uiSettings values set by the user with fallbacks to default values if not specified.
	 */
	get: <T = any>(key: string, context?: GetUiSettingsContext) => Promise<T>;
	/**
	 * Retrieves a set of all uiSettings values set by the user with fallbacks to default values if not specified.
	 */
	getAll: <T = any>(context?: GetUiSettingsContext) => Promise<Record<string, T>>;
	/**
	 * Retrieves a set of all uiSettings values set by the user.
	 */
	getUserProvided: <T = any>() => Promise<Record<string, UserProvidedValues<T>>>;
	/**
	 * Writes multiple uiSettings values and marks them as set by the user.
	 */
	setMany: (changes: Record<string, any>) => Promise<void>;
	/**
	 * Writes uiSettings value and marks it as set by the user.
	 */
	set: (key: string, value: any) => Promise<void>;
	/**
	 * Removes uiSettings value by key.
	 */
	remove: (key: string) => Promise<void>;
	/**
	 * Removes multiple uiSettings values by keys.
	 */
	removeMany: (keys: string[], options?: {
		validateKeys?: boolean;
		handleWriteErrors?: boolean;
	}) => Promise<void>;
	/**
	 * Shows whether the uiSettings value set by the user.
	 */
	isOverridden: (key: string) => boolean;
	/**
	 * Shows whether the uiSetting is a sensitive value. Used by telemetry to not send sensitive values.
	 */
	isSensitive: (key: string) => boolean;
	/**
	 * Validates the uiSettings value and returns a ValueValidation object.
	 */
	validate: (key: string, value: unknown) => Promise<ValueValidation>;
}
interface InternalIDataStreamClient<S extends MappingsDefinition, FullDocumentType = GetFieldsOf<S>, SRM extends BaseSearchRuntimeMappings = never> {
	search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(req: ClientSearchRequest<SRM>, transportOpts?: TransportRequestOptionsWithOutMeta) => Promise<api.SearchResponse<FullDocumentType, Agg>>;
	bulk: ClientBulk<FullDocumentType>;
	index: ClientIndex<FullDocumentType>;
	get: ClientGet<FullDocumentType>;
	existsIndex: ClientExistsIndex;
}
interface IntervalHistogram {
	fromTimestamp: string;
	lastUpdatedAt: string;
	min: number;
	max: number;
	mean: number;
	exceeds: number;
	stddev: number;
	percentiles: {
		50: number;
		75: number;
		90: number;
		95: number;
		99: number;
	};
}
interface InvalidateAPIKeyResult {
	/**
	 * The IDs of the API keys that were invalidated as part of the request.
	 */
	invalidated_api_keys: string[];
	/**
	 * The IDs of the API keys that were already invalidated.
	 */
	previously_invalidated_api_keys: string[];
	/**
	 * The number of errors that were encountered when invalidating the API keys.
	 */
	error_count: number;
	/**
	 * Details about these errors. This field is not present in the response when error_count is 0.
	 */
	error_details?: Array<{
		type?: string;
		reason?: string | null;
		caused_by?: {
			type?: string;
			reason?: string | null;
		};
	}>;
}
interface InvalidateAPIKeysParams {
	/**
	 * List of unique API key IDs
	 */
	ids: string[];
}
interface JsonLayoutConfigType {
	type: "json";
}
interface KibanaErrorResponseFactory {
	/**
	 * The server cannot process the request due to something that is perceived to be a client error.
	 * Status code: `400`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	badRequest(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * The request cannot be applied because it lacks valid authentication credentials for the target resource.
	 * Status code: `401`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	unauthorized(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * Server cannot grant access to a resource.
	 * Status code: `403`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	forbidden(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * Server cannot find a current representation for the target resource.
	 * Status code: `404`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	notFound(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * The request could not be completed due to a conflict with the current state of the target resource.
	 * Status code: `409`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	conflict(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * The server understands the content type of the request entity, and the syntax of the request entity is correct, but it was unable to process the contained instructions.
	 * Status code: `422`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	unprocessableContent(options?: ErrorHttpResponseOptions): IKibanaResponse;
	/**
	 * Creates an error response with defined status code and payload.
	 * @param options - {@link CustomHttpResponseOptions} configures HTTP response headers, error message and other error details to pass to the client
	 */
	customError(options: CustomHttpResponseOptions<ResponseError>): IKibanaResponse;
}
interface KibanaNotModifiedResponseFactory {
	/**
	 * Content not modified.
	 * Status code: `304`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	notModified(options: HttpResponseOptions): IKibanaResponse;
}
interface KibanaRedirectionResponseFactory {
	/**
	 * Redirect to a different URI.
	 * Status code: `302`.
	 * @param options - {@link RedirectResponseOptions} configures HTTP response body & headers.
	 * Expects `location` header to be set.
	 */
	redirected(options: RedirectResponseOptions): IKibanaResponse;
}
interface KibanaRequest<Params = unknown, Query = unknown, Body = unknown, Method extends RouteMethod = any> {
	/**
	 * A identifier to identify this request.
	 *
	 * @remarks
	 * Depending on the user's configuration, this value may be sourced from the
	 * incoming request's `X-Opaque-Id` header which is not guaranteed to be unique
	 * per request.
	 */
	readonly id: string;
	/**
	 * A UUID to identify this request.
	 *
	 * @remarks
	 * This value is NOT sourced from the incoming request's `X-Opaque-Id` header. it
	 * is always a UUID uniquely identifying the request.
	 */
	readonly uuid: string;
	/** a WHATWG URL standard object. */
	readonly url: URL;
	/** matched route details */
	readonly route: RecursiveReadonly<KibanaRequestRoute<Method>>;
	/**
	 * Readonly copy of incoming request headers.
	 * @remarks
	 * This property will contain a `filtered` copy of request headers.
	 */
	readonly headers: Headers$1;
	/**
	 * Whether or not the request is a "system request" rather than an application-level request.
	 * Can be set on the client using the `HttpFetchOptions#asSystemRequest` option.
	 */
	readonly isSystemRequest: boolean;
	/**
	 * Allows identifying requests that were created using a {@link FakeRawRequest}
	 * Even if the API facade is the same, fake requests have some stubbed functionalities.
	 */
	readonly isFakeRequest: boolean;
	/**
	 * Authorization check result, passed to the route handler.
	 * Indicates whether the specific privilege was granted or denied.
	 */
	readonly authzResult?: Record<string, boolean>;
	/**
	 * An internal request has access to internal routes.
	 * @note See the {@link KibanaRequestRouteOptions#access} route option.
	 */
	readonly isInternalApiRequest: boolean;
	/**
	 * The HTTP version sent by the client.
	 */
	readonly httpVersion: string;
	/**
	 * The protocol used by the client, inferred from the httpVersion.
	 */
	readonly protocol: HttpProtocol;
	/**
	 * The socket associated with this request.
	 * See {@link IKibanaSocket}.
	 */
	readonly socket: IKibanaSocket;
	/**
	 * Allow to listen to events bound to this request.
	 * See {@link KibanaRequestEvents}.
	 */
	readonly events: KibanaRequestEvents;
	/**
	 * The auth status of this request.
	 * See {@link KibanaRequestAuth}.
	 */
	readonly auth: KibanaRequestAuth;
	/**
	 * URL rewritten in onPreRouting request interceptor.
	 */
	readonly rewrittenUrl?: URL;
	/**
	 * The versioned route API version of this request.
	 */
	readonly apiVersion: string | undefined;
	/**
	 * The path parameter of this request.
	 */
	readonly params: Params;
	/**
	 * The query parameter of this request.
	 */
	readonly query: Query;
	/**
	 * The body payload of this request.
	 */
	readonly body: Body;
}
interface KibanaRequestAuth {
	/** true if the request has been successfully authenticated, false otherwise. */
	isAuthenticated: boolean;
}
interface KibanaRequestEvents {
	/**
	 * Observable that emits once if and when the request has been aborted.
	 */
	aborted$: Observable<void>;
	/**
	 * Observable that emits once if and when the request has been completely handled.
	 *
	 * @remarks
	 * The request may be considered completed if:
	 * - A response has been sent to the client; or
	 * - The request was aborted.
	 */
	completed$: Observable<void>;
}
interface KibanaRequestRoute<Method extends RouteMethod> {
	path: string;
	method: Method;
	options: KibanaRequestRouteOptions<Method>;
	routePath?: string;
}
interface KibanaSuccessResponseFactory {
	/**
	 * The request has succeeded.
	 * Status code: `200`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	ok<T extends HttpResponsePayload | ResponseError = any>(options?: HttpResponseOptions<T>): IKibanaResponse<T>;
	/**
	 * The request has succeeded and has led to the creation of a resource.
	 * Status code: `201`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	created<T extends HttpResponsePayload | ResponseError = any>(options?: HttpResponseOptions<T>): IKibanaResponse<T>;
	/**
	 * The request has been accepted for processing.
	 * Status code: `202`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	accepted<T extends HttpResponsePayload | ResponseError = any>(options?: HttpResponseOptions<T>): IKibanaResponse<T>;
	/**
	 * The server has successfully fulfilled the request and that there is no additional content to send in the response payload body.
	 * Status code: `204`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	noContent(options?: HttpResponseOptions): IKibanaResponse;
	/**
	 * The server indicates that there might be a mixture of responses (some tasks succeeded, some failed).
	 * Status code: `207`.
	 * @param options - {@link HttpResponseOptions} configures HTTP response body & headers.
	 */
	multiStatus(options?: HttpResponseOptions): IKibanaResponse;
}
interface Left<L> {
	tag: "Left";
	value: L;
}
interface LegacyUrlAliasTarget {
	/**
	 * The namespace that the object existed in when it was converted.
	 */
	targetSpace: string;
	/**
	 * The type of the object when it was converted.
	 */
	targetType: string;
	/**
	 * The original ID of the object, before it was converted.
	 */
	sourceId: string;
}
interface LogRecord {
	timestamp: Date;
	level: LogLevel;
	context: string;
	message: string;
	error?: Error;
	meta?: LogMeta;
	pid: number;
	spanId?: string;
	traceId?: string;
	transactionId?: string;
}
interface Logger {
	/**
	 * Log messages at the most detailed log level
	 *
	 * @param message - The log message, or a function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
	/**
	 * Log messages useful for debugging and interactive investigation
	 *
	 * @param message - The log message, or a function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
	/**
	 * Logs messages related to general application flow
	 *
	 * @param message - The log message, or a function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta): void;
	/**
	 * Logs abnormal or unexpected errors or messages
	 *
	 * @param errorOrMessage - An Error object, message string, or function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
	/**
	 * Logs abnormal or unexpected errors or messages that caused a failure in the application flow
	 *
	 * @param errorOrMessage - An Error object, message string, or function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	error<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
	/**
	 * Logs abnormal or unexpected errors or messages that caused an unrecoverable failure
	 *
	 * @param errorOrMessage - An Error object, message string, or function returning the log message
	 * @param meta - The ECS meta to attach to the log entry
	 *
	 * @remark If a function is provided for the message, it will only be evaluated if the logger's level is high enough for this level.
	 *         This can be used as an alternative to {@link Logger.isLevelEnabled} to wrap expensive logging operations into a conditional blocks.
	 */
	fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta): void;
	/** @internal */
	log(record: LogRecord): void;
	/**
	 * Checks if given level is currently enabled for this logger.
	 * Can be used to wrap expensive logging operations into conditional blocks
	 *
	 * @example
	 * ```ts
	 * if(logger.isLevelEnabled('info')) {
	 *   const meta = await someExpensiveOperation();
	 *   logger.info('some message', meta);
	 * }
	 * ```
	 *
	 * @param level The log level to check for.
	 */
	isLevelEnabled(level: LogLevelId): boolean;
	/**
	 * Returns a new {@link Logger} instance extending the current logger context.
	 *
	 * @example
	 * ```typescript
	 * const logger = loggerFactory.get('plugin', 'service'); // 'plugin.service' context
	 * const subLogger = logger.get('feature'); // 'plugin.service.feature' context
	 * ```
	 */
	get(...childContextPaths: string[]): Logger;
}
interface LoggerConfigType {
	appenders: string[];
	name: string;
	level: LogLevelId;
}
interface LoggerContextConfigInput {
	appenders?: Record<string, AppenderConfigType> | Map<string, AppenderConfigType>;
	loggers?: LoggerConfigType[];
}
interface LoggerFactory {
	/**
	 * Returns a `Logger` instance for the specified context.
	 *
	 * @param contextParts - Parts of the context to return logger for. For example
	 * get('plugins', 'pid') will return a logger for the `plugins.pid` context.
	 */
	get(...contextParts: string[]): Logger;
}
interface LoggingServiceSetup {
	/**
	 * Customizes the logging config for the plugin's context.
	 *
	 * @remarks
	 * Assumes that the `context` property of the individual `logger` items emitted by `config$`
	 * are relative to the plugin's logging context (defaults to `plugins.<plugin_id>`).
	 *
	 * @example
	 * Customize the configuration for the plugins.data.search context.
	 * ```ts
	 * core.logging.configure(
	 *   of({
	 *     appenders: new Map(),
	 *     loggers: [{ name: 'search', appenders: ['default'] }]
	 *   })
	 * )
	 * ```
	 *
	 * @param config$
	 */
	configure(config$: Observable<LoggerContextConfigInput>): void;
}
interface MatchAllFilterMeta extends FilterMeta, SerializableRecord {
	field: string;
	formattedValue: string;
}
interface MetaRewritePolicyConfig {
	type: "meta";
	/**
	 * The 'mode' specifies what action to perform on the specified properties.
	 *   - 'update' updates an existing property at the provided 'path'.
	 *   - 'remove' removes an existing property at the provided 'path'.
	 */
	mode: "remove" | "update";
	/**
	 * The properties to modify.
	 *
	 * @remarks
	 * Each provided 'path' is relative to the record's {@link LogMeta}.
	 * For the 'remove' mode, no 'value' is provided.
	 */
	properties: MetaRewritePolicyConfigProperty[];
}
interface MetaRewritePolicyConfigProperty {
	path: string;
	value?: string | number | boolean | null;
}
interface MetricsServiceSetup {
	/** Interval metrics are collected in milliseconds */
	readonly collectionInterval: number;
	/**
	 * Retrieve an observable emitting {@link EluMetrics}.
	 */
	getEluMetrics$(): Observable<EluMetrics>;
	/**
	 * Retrieve an observable emitting the {@link OpsMetrics} gathered.
	 * The observable will emit an initial value during core's `start` phase, and a new value every fixed interval of time,
	 * based on the `opts.interval` configuration property.
	 *
	 * @example
	 * ```ts
	 * core.metrics.getOpsMetrics$().subscribe(metrics => {
	 *   // do something with the metrics
	 * })
	 * ```
	 */
	getOpsMetrics$: () => Observable<OpsMetrics>;
}
interface MigrationApiDeprecationType {
	/**
	 * migrate deprecation reason denotes the API has been migrated to a different API path
	 * Please make sure that if you are only incrementing the version of the API to use 'bump' instead
	 */
	type: "migrate";
	/**
	 * new API path to be used instead
	 */
	newApiPath: string;
	/**
	 * new API method (GET POST PUT DELETE) to be used with the new API.
	 */
	newApiMethod: string;
}
interface MultiNamespaceReferencesOptions {
	/**
	 * The purpose of the call to 'collectMultiNamespaceReferences'.
	 * Default is 'collectMultiNamespaceReferences'.
	 */
	purpose?: "collectMultiNamespaceReferences" | "updateObjectsSpaces";
}
interface NodeInfo {
	/** A list of roles this node has been configured with. */
	roles: NodeRoles;
}
interface NodeRoles {
	/**
	 * The backgroundTasks role includes operations which don't involve
	 * responding to incoming http traffic from the UI.
	 */
	backgroundTasks: boolean;
	/**
	 * The ui role covers any operations that need to occur in order
	 * to handle http traffic from the browser.
	 */
	ui: boolean;
	/**
	 * Start Kibana with the specific purpose of completing the migrations phase then shutting down.
	 * @remark This role is special as it precludes the use of other roles.
	 */
	migrator: boolean;
}
interface NotFoundPluginContractResolverResponseItem {
	found: false;
}
interface NotRouteValidatorFullConfigRequest {
	params?: never;
	query?: never;
	body?: never;
}
interface NumericRollingStrategyConfig {
	type: "numeric";
	/**
	 * The suffix pattern to apply when renaming a file. The suffix will be applied
	 * after the `appender.fileName` file name, but before the file extension.
	 *
	 * Must include `%i`, as it is the value that will be converted to the file index
	 *
	 * @example
	 * ```yaml
	 * logging:
	 *   appenders:
	 *     rolling-file:
	 *       type: rolling-file
	 *       fileName: /var/logs/kibana.log
	 *       strategy:
	 *         type: default
	 *         pattern: "-%i"
	 *         max: 5
	 * ```
	 *
	 * will create `/var/logs/kibana-1.log`, `/var/logs/kibana-2.log`, and so on.
	 *
	 * Defaults to `-%i`.
	 */
	pattern: string;
	/**
	 * The maximum number of files to keep. Once this number is reached, oldest
	 * files will be deleted. Defaults to `7`
	 *
	 * @deprecated use retention policy instead
	 */
	max: number;
}
interface ObjectRequiringPrivilegeCheckResult {
	type: string;
	id: string;
	name?: string;
	requiresManageAccessControl: boolean;
}
interface ObjectTypeOptionsMeta {
	/**
	 * A string that uniquely identifies this schema. Used when generating OAS
	 * to create refs instead of inline schemas.
	 */
	id?: string;
}
interface ObservableLike<T> {
	subscribe(observer: (value: T) => void): void;
}
interface OnPostAuthAuthzResult {
	type: OnPostAuthResultType.authzResult;
	authzResult: Record<string, boolean>;
}
interface OnPostAuthNextResult {
	type: OnPostAuthResultType.next;
}
interface OnPostAuthToolkit {
	/** To pass request to the next handler */
	next: () => OnPostAuthResult;
	authzResultNext: (authzResult: Record<string, boolean>) => OnPostAuthAuthzResult;
}
interface OnPreAuthNextResult {
	type: OnPreAuthResultType.next;
}
interface OnPreAuthToolkit {
	/** To pass request to the next handler */
	next: () => OnPreAuthResult;
}
interface OnPreResponseExtensions {
	/** additional headers to attach to the response */
	headers?: ResponseHeaders;
}
interface OnPreResponseInfo {
	statusCode: number;
	/** So any pre response handler can check the headers if needed, to avoid an overwrite for example */
	headers?: ResponseHeaders;
}
interface OnPreResponseRender {
	/** additional headers to attach to the response */
	headers?: ResponseHeaders;
	/** the body to use in the response */
	body: string;
}
interface OnPreResponseResultNext {
	type: OnPreResponseResultType.next;
	headers?: ResponseHeaders;
}
interface OnPreResponseResultRender {
	type: OnPreResponseResultType.render;
	body: string;
	headers?: ResponseHeaders;
}
interface OnPreResponseToolkit {
	/** To override the response with a different body */
	render: (responseRender: OnPreResponseRender) => OnPreResponseResult;
	/** To pass request to the next handler */
	next: (responseExtensions?: OnPreResponseExtensions) => OnPreResponseResult;
}
interface OnPreRoutingResultNext {
	type: OnPreRoutingResultType.next;
}
interface OnPreRoutingResultRewriteUrl {
	type: OnPreRoutingResultType.rewriteUrl;
	url: string;
}
interface OnPreRoutingToolkit {
	/** To pass request to the next handler */
	next: () => OnPreRoutingResult;
	/** Rewrite requested resources url before is was authenticated and routed to a handler */
	rewriteUrl: (url: string) => OnPreRoutingResult;
}
interface OpsMetrics {
	/** Time metrics were recorded at. */
	collected_at: Date;
	/**
	 * Metrics related to the elasticsearch client
	 */
	elasticsearch_client: ElasticsearchClientsMetrics;
	/**
	 * Process related metrics.
	 * @remarks processes field preferred
	 */
	process: OpsProcessMetrics;
	/** Process related metrics. Reports an array of objects for each kibana pid.*/
	processes: OpsProcessMetrics[];
	/** OS related metrics */
	os: OpsOsMetrics;
	/** server response time stats */
	response_times: OpsServerMetrics["response_times"];
	/** server requests stats */
	requests: OpsServerMetrics["requests"];
	/** number of current concurrent connections to the server */
	concurrent_connections: OpsServerMetrics["concurrent_connections"];
}
interface OpsOsMetrics {
	/** The os platform */
	platform: NodeJS.Platform;
	/** The os platform release, prefixed by the platform name */
	platformRelease: string;
	/** The os distrib. Only present for linux platforms */
	distro?: string;
	/** The os distrib release, prefixed by the os distrib. Only present for linux platforms */
	distroRelease?: string;
	/** cpu load metrics */
	load: {
		/** load for last minute */
		"1m": number;
		/** load for last 5 minutes */
		"5m": number;
		/** load for last 15 minutes */
		"15m": number;
	};
	/** system memory usage metrics */
	memory: {
		/** total memory available */
		total_in_bytes: number;
		/** current free memory */
		free_in_bytes: number;
		/** current used memory */
		used_in_bytes: number;
	};
	/** the OS uptime */
	uptime_in_millis: number;
	/** cpu accounting metrics, undefined when not running in a cgroup */
	cpuacct?: {
		/** name of this process's cgroup */
		control_group: string;
		/** cpu time used by this process's cgroup */
		usage_nanos: number;
	};
	/** cpu cgroup metrics, undefined when not running in a cgroup */
	cpu?: {
		/** name of this process's cgroup */
		control_group: string;
		/** the length of the cfs period */
		cfs_period_micros: number;
		/** total available run-time within a cfs period */
		cfs_quota_micros: number;
		/** current stats on the cfs periods */
		stat: {
			/** number of cfs periods that elapsed */
			number_of_elapsed_periods: number;
			/** number of times the cgroup has been throttled */
			number_of_times_throttled: number;
			/** total amount of time the cgroup has been throttled for */
			time_throttled_nanos: number;
		};
	};
	/** memory cgroup metrics, undefined when not running in cgroup v2 */
	cgroup_memory?: {
		/** The total amount of memory currently being used by the cgroup and its descendants. */
		current_in_bytes: number;
		/** The total amount of swap currently being used by the cgroup and its descendants. */
		swap_current_in_bytes: number;
	};
}
interface OpsProcessMetrics {
	/** pid of the kibana process */
	pid: number;
	/** process memory usage */
	memory: {
		/** heap memory usage */
		heap: {
			/** total heap available */
			total_in_bytes: number;
			/** used heap */
			used_in_bytes: number;
			/** v8 heap size limit */
			size_limit: number;
		};
		/** node rss */
		resident_set_size_in_bytes: number;
		/** memory usage of C++ objects bound to JavaScript objects managed by V8 */
		external_in_bytes: number;
		/** memory allocated for array buffers. This is also included in the external value*/
		array_buffers_in_bytes: number;
	};
	/** max event loop delay since last collection */
	event_loop_delay: number;
	/** node event loop delay histogram since last collection */
	event_loop_delay_histogram: IntervalHistogram;
	/** node event loop utilization since last collection */
	event_loop_utilization: EventLoopUtilization;
	/** uptime of the kibana process */
	uptime_in_millis: number;
}
interface OpsServerMetrics {
	/** server response time stats */
	response_times: {
		/** average response time */
		avg_in_millis: number;
		/** maximum response time */
		max_in_millis: number;
	};
	/** server requests stats */
	requests: {
		/** number of disconnected requests since startup */
		disconnects: number;
		/** total number of requests handled since startup */
		total: number;
		/** number of request handled per response status code */
		statusCodes: Record<number, number>;
	};
	/** number of current concurrent connections to the server */
	concurrent_connections: number;
}
interface PackageInfo {
	version: string;
	branch: string;
	buildNum: number;
	buildSha: string;
	buildShaShort: string;
	buildDate: Date;
	buildFlavor: BuildFlavor;
	dist: boolean;
}
interface PatternLayoutConfigType {
	type: "pattern";
	highlight?: boolean;
	pattern?: string;
}
interface PersistableState<P extends SerializableRecord = SerializableRecord> {
	/**
	 * Function which reports telemetry information. This function is essentially
	 * a "reducer" - it receives the existing "stats" object and returns an
	 * updated version of the "stats" object.
	 *
	 * @param state The persistable state serializable state object.
	 * @param stats Stats object containing the stats which were already
	 *              collected. This `stats` object shall not be mutated in-line.
	 * @returns A new stats object augmented with new telemetry information.
	 */
	telemetry: (state: P, stats: Record<string, any>) => Record<string, any>;
	/**
	 * A function which receives state and a list of references and should return
	 * back the state with references injected. The default is an identity
	 * function.
	 *
	 * @param state The persistable state serializable state object.
	 * @param references List of saved object references.
	 * @returns Persistable state object with references injected.
	 */
	inject: (state: P, references: SavedObjectReference$1[]) => P;
	/**
	 * A function which receives state and should return the state with references
	 * extracted and an array of the extracted references. The default case could
	 * simply return the same state with an empty array of references.
	 *
	 * @param state The persistable state serializable state object.
	 * @returns Persistable state object with references extracted and a list of
	 *          references.
	 */
	extract: (state: P) => {
		state: P;
		references: SavedObjectReference$1[];
	};
	/**
	 * A list of migration functions, which migrate the persistable state
	 * serializable object to the next version. Migration functions should be
	 * keyed using semver, where the version indicates which version the state
	 * will be migrated to.
	 */
	migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
}
interface PersistableStateService<P extends Serializable = Serializable> {
	/**
	 * Function which reports telemetry information. This function is essentially
	 * a "reducer" - it receives the existing "stats" object and returns an
	 * updated version of the "stats" object.
	 *
	 * @param state The persistable state serializable state object.
	 * @param stats Stats object containing the stats which were already
	 *              collected. This `stats` object shall not be mutated in-line.
	 * @returns A new stats object augmented with new telemetry information.
	 */
	telemetry(state: P, collector: Record<string, any>): Record<string, any>;
	/**
	 * A function which receives state and a list of references and should return
	 * back the state with references injected. The default is an identity
	 * function.
	 *
	 * @param state The persistable state serializable state object.
	 * @param references List of saved object references.
	 * @returns Persistable state object with references injected.
	 */
	inject(state: P, references: SavedObjectReference$1[]): P;
	/**
	 * A function which receives state and should return the state with references
	 * extracted and an array of the extracted references. The default case could
	 * simply return the same state with an empty array of references.
	 *
	 * @param state The persistable state serializable state object.
	 * @returns Persistable state object with references extracted and a list of
	 *          references.
	 */
	extract(state: P): {
		state: P;
		references: SavedObjectReference$1[];
	};
	/**
	 * A function which receives the state of an older object and version and
	 * should migrate the state of the object to the latest possible version using
	 * the `.migrations` dictionary provided on a {@link PersistableState} item.
	 *
	 * @param state The persistable state serializable state object.
	 * @param version Current semver version of the `state`.
	 * @returns A serializable state object migrated to the latest state.
	 */
	migrateToLatest?: (state: VersionedState<P>) => P;
	/**
	 * returns all registered migrations
	 */
	getAllMigrations: () => MigrateFunctionsObject;
}
interface PhraseFilterMetaParams extends SerializableRecord {
	query: PhraseFilterValue;
}
interface Plugin$1<TSetup = void, TStart = void, TPluginsSetup extends Record<string, any> = {}, TPluginsStart extends Record<string, any> = {}> {
	setup(core: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;
	start(core: CoreStart, plugins: TPluginsStart): TStart;
	stop?(): MaybePromise<void>;
}
interface PluginInitializerContext<ConfigSchema = unknown> {
	opaqueId: PluginOpaqueId;
	env: {
		mode: EnvironmentMode;
		packageInfo: Readonly<PackageInfo>;
		instanceUuid: string;
		configs: readonly string[];
	};
	/**
	 * Access the configuration for this particular Kibana node.
	 * Can be used to determine which `roles` the current process was started with.
	 *
	 * @example
	 * ```typescript
	 * // plugins/my-plugin/server/plugin.ts
	 *
	 * export class MyPlugin implements Plugin  {
	 *   constructor(private readonly initContext: PluginInitializerContext) {
	 *     this.initContext = initContext;
	 *   }
	 *   setup() {
	 *     if (this.initContext.node.roles.backgroundTasks) {
	 *       // run background tasks
	 *     } else if (this.initContext.node.roles.ui) {
	 *       // register http routes, etc
	 *     }
	 *   }
	 * }
	 * ```
	 */
	node: NodeInfo;
	/**
	 * {@link LoggerFactory | logger factory} instance already bound to the plugin's logging context
	 *
	 * @example
	 * ```typescript
	 * // plugins/my-plugin/server/plugin.ts
	 * // "id: myPlugin" in `plugins/my-plugin/kibana.yaml`
	 *
	 * export class MyPlugin implements Plugin  {
	 *   constructor(private readonly initContext: PluginInitializerContext) {
	 *     this.logger = initContext.logger.get();
	 *     // `logger` context: `plugins.myPlugin`
	 *     this.mySubLogger = initContext.logger.get('sub'); // or this.logger.get('sub');
	 *     // `mySubLogger` context: `plugins.myPlugin.sub`
	 *   }
	 * }
	 * ```
	 */
	logger: LoggerFactory;
	/**
	 * Accessors for the plugin's configuration
	 */
	config: {
		/**
		 * Provide access to Kibana legacy configuration values.
		 *
		 * @remarks Naming not final here, it may be renamed in a near future
		 * @deprecated Accessing configuration values outside of the plugin's config scope is highly discouraged.
		 * Can be removed when https://github.com/elastic/kibana/issues/119862 is done.
		 */
		legacy: {
			globalConfig$: Observable<SharedGlobalConfig>;
			get: () => SharedGlobalConfig;
		};
		/**
		 * Return an observable of the plugin's configuration
		 *
		 * @example
		 * ```typescript
		 * // plugins/my-plugin/server/plugin.ts
		 *
		 * export class MyPlugin implements Plugin {
		 *   constructor(private readonly initContext: PluginInitializerContext) {}
		 *   setup(core) {
		 *     this.configSub = this.initContext.config.create<MyPluginConfigType>().subscribe((config) => {
		 *       this.myService.reconfigure(config);
		 *     });
		 *   }
		 *   stop() {
		 *     this.configSub.unsubscribe();
		 *   }
		 * ```
		 *
		 * @example
		 * ```typescript
		 * // plugins/my-plugin/server/plugin.ts
		 *
		 * export class MyPlugin implements Plugin {
		 *   constructor(private readonly initContext: PluginInitializerContext) {}
		 *   async setup(core) {
		 *     this.config = await this.initContext.config.create<MyPluginConfigType>().pipe(take(1)).toPromise();
		 *   }
		 *   stop() {
		 *     this.configSub.unsubscribe();
		 *   }
		 * ```
		 *
		 * @remarks The underlying observable has a replay effect, meaning that awaiting for the first emission
		 *          will be resolved at next tick, without risks to delay any asynchronous code's workflow.
		 */
		create: <T = ConfigSchema>() => Observable<T>;
		/**
		 * Return the current value of the plugin's configuration synchronously.
		 *
		 * @example
		 * ```typescript
		 * // plugins/my-plugin/server/plugin.ts
		 *
		 * export class MyPlugin implements Plugin {
		 *   constructor(private readonly initContext: PluginInitializerContext) {}
		 *   setup(core) {
		 *     const config = this.initContext.config.get<MyPluginConfigType>();
		 *     // do something with the config
		 *   }
		 * }
		 * ```
		 *
		 * @remarks This should only be used when synchronous access is an absolute necessity, such
		 *          as during the plugin's setup or start lifecycle. For all other usages,
		 *          {@link create} should be used instead.
		 */
		get: <T = ConfigSchema>() => T;
	};
}
interface PluginsServiceSetup {
	/**
	 * Returns a promise that will resolve with the requested plugin setup contracts once all plugins have been set up.
	 *
	 * If called when plugins are already setup, the returned promise will resolve instantly.
	 *
	 * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
	 * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
	 *
	 * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
	 * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
	 * is made available.
	 * Therefore, by using this API, you implicitly agree to:
	 * - consider it as technical debt and open an issue to track the tech debt resolution
	 * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
	 *
	 * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
	 *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
	 *
	 * @example
	 * ```ts
	 * setup(core) {
	 *   core.plugins.onSetup<{pluginA: SetupContractA, pluginB: SetupContractA}>('pluginA', 'pluginB')
	 *       .then(({ pluginA, pluginB }) => {
	 *         if(pluginA.found && pluginB.found) {
	 *           // do something with pluginA.contract and pluginB.contract
	 *         }
	 *       });
	 * }
	 *
	 * @experimental
	 * ```
	 */
	onSetup: PluginContractResolver;
	/**
	 * Returns a promise that will resolve with the requested plugin start contracts once all plugins have been started.
	 *
	 * If called when plugins are already started, the returned promise will resolve instantly.
	 *
	 * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
	 * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
	 *
	 * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
	 * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
	 * is made available.
	 * Therefore, by using this API, you implicitly agree to:
	 * - consider it as technical debt and open an issue to track the tech debt resolution
	 * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
	 *
	 * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
	 *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
	 *
	 * @example
	 * ```ts
	 * setup(core) {
	 *   core.plugins.onStart<{pluginA: StartContractA, pluginB: StartContractA}>('pluginA', 'pluginB')
	 *       .then(({ pluginA, pluginB }) => {
	 *         if(pluginA.found && pluginB.found) {
	 *           // do something with pluginA.contract and pluginB.contract
	 *         }
	 *       });
	 * }
	 *
	 * @experimental
	 * ```
	 */
	onStart: PluginContractResolver;
}
interface PluginsServiceStart {
	/**
	 * Returns a promise that will resolve with the requested plugin start contracts once all plugins have been started.
	 *
	 * If called when plugins are already started, the returned promise will resolve instantly.
	 *
	 * The API can only be used to resolve required dependencies, optional dependencies, or dependencies explicitly
	 * defined as `runtimePluginDependencies` in the calling plugin's manifest, otherwise the API will throw at call time.
	 *
	 * **Important:** This API should only be used when trying to address cyclic dependency issues that can't easily
	 * be solved otherwise. This is meant to be a temporary workaround only supposed to be used until a better solution
	 * is made available.
	 * Therefore, by using this API, you implicitly agree to:
	 * - consider it as technical debt and open an issue to track the tech debt resolution
	 * - accept that this is only a temporary solution, and will comply to switching to the long term solution when asked by the Core team
	 *
	 * @remark The execution order is not guaranteed to be consistent. Only guarantee is that the returned promise will be
	 *         resolved once all plugins are started, and before Core's `start` lifecycle is resumed.
	 *
	 * @example
	 * ```ts
	 * start(core) {
	 *   core.plugins.onStart<{pluginA: StartContractA, pluginB: StartContractA}>('pluginA', 'pluginB')
	 *       .then(({ pluginA, pluginB }) => {
	 *         if(pluginA.found && pluginB.found) {
	 *           // do something with pluginA.contract and pluginB.contract
	 *         }
	 *       });
	 * }
	 * ```
	 *
	 * @experimental
	 */
	onStart: PluginContractResolver;
}
interface PricingProductFeature {
	id: string;
	description: string;
	products: IPricingProduct[];
}
interface PricingProductObservability {
	type: "observability";
	tier: "complete" | "logs_essentials";
}
interface PricingProductSecurity {
	type: "security";
	tier: "search_ai_lake" | "complete" | "essentials";
	product_lines: Array<"ai_soc" | "endpoint" | "cloud">;
}
interface PricingServiceSetup {
	/**
	 * Check if a specific feature is available in the current pricing tier configuration.
	 * Resolves asynchronously after the pricing service has been set up and all the plugins have registered their features.
	 *
	 * @example
	 * ```ts
	 * // my-plugin/server/plugin.ts
	 * public setup(core: CoreSetup) {
	 *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
	 * }
	 * ```
	 */
	isFeatureAvailable(featureId: string): Promise<boolean>;
	/**
	 * Register product features that are available in specific pricing tiers.
	 *
	 * @example
	 * ```ts
	 * // my-plugin/server/plugin.ts
	 * public setup(core: CoreSetup) {
	 *   core.pricing.registerProductFeatures([
	 *     {
	 *       id: 'my_premium_feature',
	 *       description: 'A premium feature only available in specific tiers',
	 *       products: [{ name: 'security', tier: 'complete' }]
	 *     }
	 *   ]);
	 * }
	 * ```
	 */
	registerProductFeatures(features: PricingProductFeature[]): void;
}
interface PricingServiceStart {
	/**
	 * Check if a specific feature is available based on the current pricing tier configuration.
	 * Delegates to the underlying {@link IPricingTiersClient.isFeatureAvailable} implementation.
	 *
	 * @param featureId - The identifier of the feature to check
	 * @returns True if the feature is available in the current pricing tier, false otherwise
	 *
	 * @example
	 * ```ts
	 * // my-plugin/server/plugin.ts OR my-plugin/public/plugin.ts
	 * public start(core: CoreStart) {
	 *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
	 *   // Use the availability information to enable/disable functionality
	 * }
	 * ```
	 */
	isFeatureAvailable: IPricingTiersClient["isFeatureAvailable"];
	/**
	 * @deprecated Use {@link PricingServiceStart.isFeatureAvailable} instead.
	 */
	getActiveProduct: IPricingTiersClient["getActiveProduct"];
}
interface PrivilegeSet {
	anyRequired?: AnyRequiredCondition;
	allRequired?: AllRequiredCondition;
}
interface RangeFilterParams extends SerializableRecord {
	from?: number | string;
	to?: number | string;
	gt?: number | string;
	lt?: number | string;
	gte?: number | string;
	lte?: number | string;
	format?: string;
}
interface RecursiveReadonlyArray<T> extends ReadonlyArray<RecursiveReadonly<T>> {
}
interface RedactNamespacesParams<T, A extends string> {
	/** Relevant saved object */
	savedObject: SavedObject<T>;
	/**
	 * The authorization map from CheckAuthorizationResult: a map of
	 * type to record of action/AuthorizationTypeEntry
	 * (spaces/globallyAuthz'd)
	 */
	typeMap: AuthorizationTypeMap<A>;
}
interface RegisterDeprecationsConfig {
	/**
	 * Method called when the user wants to list any existing deprecations.
	 * Returns the list of deprecation messages to warn about.
	 * @param {GetDeprecationsContext} context Scoped clients and helpers to ease fetching the deprecations.
	 */
	getDeprecations: (context: GetDeprecationsContext) => MaybePromise<DeprecationsDetails[]>;
}
interface RemovalApiDeprecationType {
	/**
	 * remove deprecation reason denotes the API was fully removed with no replacement
	 */
	type: "remove";
}
interface Request$1 extends RequestParams {
	id: string;
	name: string;
	json?: object;
	response?: Response$1;
	startTime: number;
	stats?: RequestStatistics;
	status: RequestStatus;
	time?: number;
}
interface RequestHandlerContext extends RequestHandlerContextBase {
	/**
	 * Promise that resolves the {@link CoreRequestHandlerContext}
	 */
	core: Promise<CoreRequestHandlerContext>;
}
interface RequestHandlerContextBase {
	/**
	 * Await all the specified context parts and return them.
	 *
	 * @example
	 * ```ts
	 * const resolved = await context.resolve(['core', 'pluginA']);
	 * const esClient = resolved.core.elasticsearch.client;
	 * const pluginAService = resolved.pluginA.someService;
	 * ```
	 */
	resolve: <T extends keyof Omit<this, "resolve">>(parts: T[]) => Promise<AwaitedProperties<Pick<this, T>>>;
}
interface RequestParams {
	id?: string;
	description?: string;
	searchSessionId?: string;
}
interface RequestStatistic {
	label: string;
	description?: string;
	value: any;
}
interface RequestStatistics {
	[key: string]: RequestStatistic;
}
interface ResolveCapabilitiesOptions {
	/**
	 * The path(s) of capabilities that the API consumer is interested in. The '*' wildcard is supported as a suffix only.
	 *
	 * E.g. capabilityPath: "*" or capabilityPath: "myPlugin.*" or capabilityPath: "myPlugin.myKey"
	 *
	 * @remark All the capabilities will be returned, but the ones not matching the specified path(s) may not have been processed
	 *        by the capability switchers and should not be used.
	 */
	capabilityPath: string | string[];
	/**
	 * Indicates if capability switchers are supposed to return a default set of capabilities.
	 *
	 * Defaults to `false`
	 */
	useDefaultCapabilities?: boolean;
}
interface Response$1 {
	json?: object;
	requestParams?: ConnectionRequestParams;
	time?: number;
}
interface RetentionPolicyConfig {
	maxFiles?: number;
	maxAccumulatedFileSize?: ByteSizeValue;
	removeOlderThan?: Duration;
}
interface RewriteAppenderConfig {
	type: "rewrite";
	/**
	 * The {@link Appender | appender(s)} to pass the log event to after
	 * implementing the specified rewrite policy.
	 */
	appenders: string[];
	/**
	 * The {@link RewritePolicy | policy} to use to manipulate the provided data.
	 */
	policy: RewritePolicyConfig;
}
interface Right<R> {
	tag: "Right";
	value: R;
}
interface RollingFileAppenderConfig {
	type: "rolling-file";
	/**
	 * The layout to use when writing log entries
	 */
	layout: LayoutConfigType;
	/**
	 * The absolute path of the file to write to.
	 */
	fileName: string;
	/**
	 * The {@link TriggeringPolicy | policy} to use to determine if a rollover should occur.
	 */
	policy: TriggeringPolicyConfig;
	/**
	 * The {@link RollingStrategy | rollout strategy} to use for rolling.
	 */
	strategy: RollingStrategyConfig;
	/**
	 * The {@link RetentionPolicy | retention strategy} to use to know which files to keep.
	 */
	retention?: RetentionPolicyConfig;
}
interface RouteConfig<P, Q, B, Method extends RouteMethod> {
	/**
	 * The endpoint _within_ the router path to register the route.
	 *
	 * @remarks
	 * E.g. if the router is registered at `/elasticsearch` and the route path is
	 * `/search`, the full path for the route is `/elasticsearch/search`.
	 * Supports:
	 *   - named path segments `path/{name}`.
	 *   - optional path segments `path/{position?}`.
	 *   - multi-segments `path/{coordinates*2}`.
	 * Segments are accessible within a handler function as `params` property of {@link KibanaRequest} object.
	 * To have read access to `params` you *must* specify validation schema with {@link RouteConfig.validate}.
	 */
	path: string;
	/**
	 * A schema created with `@kbn/config-schema` that every request will be validated against.
	 *
	 * @remarks
	 * You *must* specify a validation schema to be able to read:
	 *   - url path segments
	 *   - request query
	 *   - request body
	 * To opt out of validating the request, specify `validate: false`. In this case
	 * request params, query, and body will be **empty** objects and have no
	 * access to raw values.
	 * In some cases you may want to use another validation library. To do this, you need to
	 * instruct the `@kbn/config-schema` library to output **non-validated values** with
	 * setting schema as `schema.object({}, { unknowns: 'allow' })`;
	 *
	 * @example
	 * ```ts
	 *  import { schema } from '@kbn/config-schema';
	 *  router.get({
	 *   path: 'path/{id}',
	 *   validate: {
	 *     params: schema.object({
	 *       id: schema.string(),
	 *     }),
	 *     query: schema.object({...}),
	 *     body: schema.object({...}),
	 *   },
	 * },
	 * (context, req, res,) {
	 *   req.params; // type Readonly<{id: string}>
	 *   console.log(req.params.id); // value
	 * });
	 *
	 * router.get({
	 *   path: 'path/{id}',
	 *   validate: false, // handler has no access to params, query, body values.
	 * },
	 * (context, req, res,) {
	 *   req.params; // type Readonly<{}>;
	 *   console.log(req.params.id); // undefined
	 * });
	 *
	 * router.get({
	 *   path: 'path/{id}',
	 *   validate: {
	 *     // handler has access to raw non-validated params in runtime
	 *     params: schema.object({}, { unknowns: 'allow' })
	 *   },
	 * },
	 * (context, req, res,) {
	 *   req.params; // type Readonly<{}>;
	 *   console.log(req.params.id); // value
	 *   myValidationLibrary.validate({ params: req.params });
	 * });
	 * ```
	 */
	validate: RouteValidator<P, Q, B> | (() => RouteValidator<P, Q, B>) | false;
	/**
	 * Defines the security requirements for a route, including authorization and authentication.
	 */
	security: RouteSecurity;
	/**
	 * Additional route options {@link RouteConfigOptions}.
	 */
	options?: RouteConfigOptions<Method>;
}
interface RouteConfigOptions<Method extends RouteMethod> {
	/**
	 * Defines authentication mode for a route:
	 * - true. A user has to have valid credentials to access a resource
	 * - false. A user can access a resource without any credentials.
	 * - 'optional'. A user can access a resource, and will be authenticated if provided credentials are valid.
	 *               Can be useful when we grant access to a resource but want to identify a user if possible.
	 *
	 * Defaults to `true` if an auth mechanism is registered.
	 *
	 * @deprecated Use `security.authc.enabled` instead
	 */
	authRequired?: boolean | "optional";
	/**
	 * Defines xsrf protection requirements for a route:
	 * - true. Requires an incoming POST/PUT/DELETE request to contain `kbn-xsrf` header.
	 * - false. Disables xsrf protection.
	 *
	 * Set to true by default
	 */
	xsrfRequired?: Method extends "get" ? never : boolean;
	/**
	 * Defines intended request origin of the route:
	 * - public. The route is public, declared stable and intended for external access.
	 *           In the future, may require an incoming request to contain a specified header.
	 * - internal. The route is internal and intended for internal access only.
	 *
	 * Defaults to 'internal' If not declared,
	 */
	access?: RouteAccess;
	/**
	 * Additional metadata tag strings to attach to the route.
	 */
	tags?: readonly string[];
	/**
	 * Additional body options {@link RouteConfigOptionsBody}.
	 */
	body?: Method extends "get" | "options" ? undefined : RouteConfigOptionsBody;
	/**
	 * Defines per-route timeouts.
	 */
	timeout?: {
		/**
		 * Milliseconds to receive the payload
		 */
		payload?: Method extends "get" | "options" ? undefined : number;
		/**
		 * Milliseconds the socket can be idle before it's closed
		 */
		idleSocket?: number;
	};
	/**
	 * Short summary of this route. Required for all routes used in OAS documentation.
	 *
	 * @example
	 * ```ts
	 * router.get({
	 *  path: '/api/foo/{id}',
	 *  access: 'public',
	 *  summary: `Get foo resources for an ID`,
	 * })
	 * ```
	 */
	summary?: string;
	/**
	 * Optional API description, which supports [CommonMark](https://spec.commonmark.org) markdown formatting
	 *
	 * @example
	 * ```ts
	 * router.get({
	 *  path: '/api/foo/{id}',
	 *  access: 'public',
	 *  summary: `Get foo resources for an ID`,
	 *  description: `Foo resources require **X** and **Y** `read` permissions to access.`,
	 * })
	 * ```
	 */
	description?: string;
	/**
	 * Description of deprecations for this HTTP API.
	 *
	 * @remark This will assist Kibana HTTP API users when upgrading to new versions
	 * of the Elastic stack (via Upgrade Assistant) and will be surfaced in documentation
	 * created from HTTP API introspection (like OAS).
	 *
	 * Setting this object marks the route as deprecated.
	 *
	 * @remarks This may be surfaced in OAS documentation.
	 * @public
	 */
	deprecated?: RouteDeprecationInfo;
	/**
	 * Filepath to a YAML file or a partial {@link OpenAPIV3.OperationObject} to
	 * be merged with the code generated for this endpoint.
	 *
	 * @note Always instantiate the objects lazily to avoid unnecessarily loading
	 *       objects into memory.
	 *
	 * @example
	 * As a path to a OAS file
	 * () => path.join(__dirname, 'my_examples.yaml')
	 *
	 * @example
	 * As an object
	 * () => ({
	 *      requestBody: {
	 *        content: {
	 *          200: {
	 *            examples: {
	 *              fooExample: {
	 *                value: { coolType: true } as { coolType: true },
	 *              },
	 *            },
	 *          },
	 *        },
	 *      },
	 *  })
	 */
	oasOperationObject?: () => string | DeepPartial<Pick<OpenAPIV3.OperationObject, "requestBody" | "responses">>;
	/**
	 * Whether this route should be treated as "invisible" and excluded from router
	 * OAS introspection.
	 *
	 * @default false
	 */
	excludeFromOAS?: boolean;
	/**
	 * Whether the rate limiter should never throttle this route.
	 *
	 * @default false
	 */
	excludeFromRateLimiter?: boolean;
	/**
	 * Release version or date that this route will be removed
	 * Use with `deprecated: true`
	 *
	 * @remarks This will be surfaced in OAS documentation.
	 * @example 9.0.0
	 */
	discontinued?: string;
	/**
	 * Whether this endpoint is being used to serve generated or static HTTP resources
	 * like JS, CSS or HTML. _Do not set to `true` for HTTP APIs._
	 *
	 * @note Unless you need this setting for a special case, rather use the
	 *       {@link HttpResources} service exposed to plugins directly.
	 *
	 * @note This is not a security feature. It may affect aspects of the HTTP
	 *       response like headers.
	 *
	 * @default false
	 */
	httpResource?: boolean;
	/**
	 * Based on the the ES API specification (see https://github.com/elastic/elasticsearch-specification)
	 * Kibana APIs can also specify some metadata about API availability.
	 *
	 * This setting is only applicable if your route `access` is `public`.
	 *
	 * @remark intended to be used for informational purposes only.
	 */
	availability?: {
		/** @default stable */
		stability?: "experimental" | "beta" | "stable";
		/**
		 * The stack version in which the route was introduced (eg: 8.15.0).
		 */
		since?: string;
	};
}
interface RouteConfigOptionsBody {
	/**
	 * A string or an array of strings with the allowed mime types for the endpoint. Use this settings to limit the set of allowed mime types. Note that allowing additional mime types not listed
	 * above will not enable them to be parsed, and if parse is true, the request will result in an error response.
	 *
	 * Default value: allows parsing of the following mime types:
	 * * application/json
	 * * application/*+json
	 * * application/octet-stream
	 * * application/x-www-form-urlencoded
	 * * multipart/form-data
	 * * text/*
	 */
	accepts?: RouteContentType | RouteContentType[] | string | string[];
	/**
	 * A mime type string overriding the 'Content-Type' header value received.
	 */
	override?: string;
	/**
	 * Limits the size of incoming payloads to the specified byte count. Allowing very large payloads may cause the server to run out of memory.
	 *
	 * Default value: The one set in the kibana.yml config file under the parameter `server.maxPayload`.
	 */
	maxBytes?: number;
	/**
	 * The processed payload format. The value must be one of:
	 * * 'data' - the incoming payload is read fully into memory. If parse is true, the payload is parsed (JSON, form-decoded, multipart) based on the 'Content-Type' header. If parse is false, a raw
	 * Buffer is returned.
	 * * 'stream' - the incoming payload is made available via a Stream.Readable interface. If the payload is 'multipart/form-data' and parse is true, field values are presented as text while files
	 * are provided as streams. File streams from a 'multipart/form-data' upload will also have a hapi property containing the filename and headers properties. Note that payload streams for multipart
	 * payloads are a synthetic interface created on top of the entire multipart content loaded into memory. To avoid loading large multipart payloads into memory, set parse to false and handle the
	 * multipart payload in the handler using a streaming parser (e.g. pez).
	 *
	 * Default value: 'data', unless no validation.body is provided in the route definition. In that case the default is 'stream' to alleviate memory pressure.
	 */
	output?: (typeof validBodyOutput)[number];
	/**
	 * Determines if the incoming payload is processed or presented raw. Available values:
	 * * true - if the request 'Content-Type' matches the allowed mime types set by allow (for the whole payload as well as parts), the payload is converted into an object when possible. If the
	 * format is unknown, a Bad Request (400) error response is sent. Any known content encoding is decoded.
	 * * false - the raw payload is returned unmodified.
	 * * 'gunzip' - the raw payload is returned unmodified after any known content encoding is decoded.
	 *
	 * Default value: true, unless no validation.body is provided in the route definition. In that case the default is false to alleviate memory pressure.
	 */
	parse?: boolean | "gunzip";
}
interface RouteDeprecationInfo {
	/**
	 * Link to the documentation for more details on the deprecation.
	 *
	 * @remark See template and instructions in `<REPO_ROOT>/docs/upgrade-notes.asciidoc` for instructions on adding a release note.
	 */
	documentationUrl: string;
	/**
	 * The description message to be displayed for the deprecation.
	 * This will also appear in the '299 Kibana-{version} {message}' header warning when someone calls the route.
	 * Keep the message concise to avoid long header values. It is recommended to keep the message under 255 characters.
	 * Check the README for writing deprecations in `src/core/server/deprecations/README.mdx`
	 */
	message?: string;
	/**
	 * levels:
	 * - warning: will not break deployment upon upgrade.
	 * - critical: needs to be addressed before upgrade.
	 */
	severity: "warning" | "critical";
	/**
	 * API deprecation reason:
	 * - bump: New version of the API is available.
	 * - remove: API was fully removed with no replacement.
	 * - migrate: API has been migrated to a different path.
	 * - deprecated: the deprecated API is deprecated, it might be removed or migrated, or got a version bump in the future.
	 *   It is a catch-all deprecation for APIs but the API will work in the next upgrades.
	 */
	reason: VersionBumpDeprecationType | RemovalApiDeprecationType | MigrationApiDeprecationType | DeprecateApiDeprecationType;
}
interface RouteSecurity {
	authz: RouteAuthz;
	authc?: RouteAuthc;
}
interface RouteValidationResultFactory {
	ok: <T>(value: T) => {
		value: T;
	};
	badRequest: (error: Error | string, path?: string[]) => {
		error: RouteValidationError;
	};
}
interface RouteValidatorConfig<P, Q, B> {
	/**
	 * Validation logic for the URL params
	 * @public
	 */
	params?: RouteValidationSpec<P>;
	/**
	 * Validation logic for the Query params
	 * @public
	 */
	query?: RouteValidationSpec<Q>;
	/**
	 * Validation logic for the body payload
	 * @public
	 */
	body?: RouteValidationSpec<B>;
}
interface RouteValidatorFullConfigResponse {
	[statusCode: number]: {
		/**
		 * A description of the response. This is required input for complete OAS documentation.
		 */
		description?: string;
		/**
		 * A string representing the mime type of the response body.
		 */
		bodyContentType?: string;
		body?: LazyValidator;
	};
	unsafe?: {
		body?: boolean;
	};
}
interface RouteValidatorOptions {
	/**
	 * Set the `unsafe` config to avoid running some additional internal *safe* validations on top of your custom validation
	 * @public
	 */
	unsafe?: {
		params?: boolean;
		query?: boolean;
		body?: boolean;
	};
}
interface RouteValidatorRequestAndResponses<P, Q, B> {
	request: RouteValidatorFullConfigRequest<P, Q, B>;
	/**
	 * Response schemas for your route.
	 */
	response?: RouteValidatorFullConfigResponse;
}
interface RouterDeprecatedApiDetails {
	routeDeprecationOptions?: RouteDeprecationInfo;
	routeMethod: RouteMethod;
	routePath: string;
	routeVersion?: string;
	routeAccess?: RouteAccess;
}
interface RouterRoute {
	method: RouteMethod;
	path: string;
	options: RouteConfigOptions<RouteMethod>;
	security?: InternalRouteSecurity;
	/**
	 * @note if providing a function to lazily load your validation schemas assume
	 *       that the function will only be called once.
	 */
	validationSchemas?: (() => RouteValidator<unknown, unknown, unknown>) | RouteValidator<unknown, unknown, unknown> | false;
	handler: (req: Request$1, responseToolkit: ResponseToolkit) => Promise<ResponseObject | Boom.Boom<any>>;
	isVersioned: boolean;
}
interface SavedObject<T = unknown> {
	/** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
	id: string;
	/**  The type of Saved Object. Each plugin can define its own custom Saved Object types. */
	type: string;
	/** An opaque version number which changes on each successful write operation. Can be used for implementing optimistic concurrency control. */
	version?: string;
	/** Timestamp of the time this document had been created.  */
	created_at?: string;
	/** The ID of the user who created this object. */
	created_by?: string;
	/** Timestamp of the last time this document had been updated.  */
	updated_at?: string;
	/** The ID of the user who last updated this object. */
	updated_by?: string;
	/** Error associated with this object, populated if an operation failed for this object.  */
	error?: SavedObjectError;
	/** The data for a Saved Object is stored as an object in the `attributes` property. **/
	attributes: T;
	/** {@inheritdoc SavedObjectReference} */
	references: SavedObjectReference[];
	/**
	 * {@inheritdoc SavedObjectsMigrationVersion}
	 * @deprecated Use `typeMigrationVersion` instead.
	 */
	migrationVersion?: SavedObjectsMigrationVersion;
	/** A semver value that is used when upgrading objects between Kibana versions. */
	coreMigrationVersion?: string;
	/** A semver value that is used when migrating documents between Kibana versions. */
	typeMigrationVersion?: string;
	/**
	 * Space(s) that this saved object exists in. This attribute is not used for "global" saved object types which are registered with
	 * `namespaceType: 'agnostic'`.
	 */
	namespaces?: string[];
	/**
	 * The ID of the saved object this originated from. This is set if this object's `id` was regenerated; that can happen during migration
	 * from a legacy single-namespace type, or during import. It is only set during migration or create operations. This is used during import
	 * to ensure that ID regeneration is deterministic, so saved objects will be overwritten if they are imported multiple times into a given
	 * space.
	 */
	originId?: string;
	/**
	 * Flag indicating if a saved object is managed by Kibana (default=false)
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
	/**
	 * Access control information of the saved object.
	 * This can be be used to customize access to the object in addition to RBAC, e.g.
	 * to set an object to read-only mode, where it is only editable by the owner of
	 * the object (or an admin), even if other users are granted write access via a role.
	 */
	accessControl?: SavedObjectAccessControl;
}
interface SavedObjectAccessControl {
	/** The ID of the user who owns this object. */
	owner: string;
	/**
	 * The access mode of the object. `write_restricted` is editable only by the owner and admin users.
	 * Access mode `default` is editable by all users with write access to the object.
	 */
	accessMode: "write_restricted" | "default";
}
interface SavedObjectDoc<T = unknown> {
	attributes: T;
	id: string;
	type: string;
	namespace?: string;
	namespaces?: string[];
	migrationVersion?: SavedObjectsMigrationVersion;
	coreMigrationVersion?: string;
	typeMigrationVersion?: string;
	version?: string;
	updated_at?: string;
	updated_by?: string;
	created_at?: string;
	created_by?: string;
	originId?: string;
	managed?: boolean;
	accessControl?: SavedObjectAccessControl;
}
interface SavedObjectError {
	error: string;
	message: string;
	statusCode: number;
	metadata?: Record<string, unknown>;
}
interface SavedObjectExportBaseOptions {
	/** The http request initiating the export. */
	request: KibanaRequest;
	/** flag to also include all related saved objects in the export stream. */
	includeReferencesDeep?: boolean;
	/**
	 * Flag to also include namespace information in the export stream. By default, namespace information is not included in exported objects.
	 * This is only intended to be used internally during copy-to-space operations, and it is not exposed as an option for the external HTTP
	 * route for exports.
	 */
	includeNamespaces?: boolean;
	/** flag to not append {@link SavedObjectsExportResultDetails | export details} to the end of the export stream. */
	excludeExportDetails?: boolean;
	/** optional namespace to override the namespace used by the savedObjectsClient. */
	namespace?: string;
}
interface SavedObjectMigrationContext {
	/**
	 * logger instance to be used by the migration handler
	 */
	readonly log: SavedObjectsMigrationLogger;
	/**
	 * The migration version that this migration function is defined for
	 */
	readonly migrationVersion: string;
	/**
	 * The version in which this object type is being converted to a multi-namespace type
	 * @deprecated Converting to multi-namespace clashes with the ZDT requirement for serverless
	 */
	readonly convertToMultiNamespaceTypeVersion?: string;
	/**
	 * Whether this is a single-namespace type or not
	 */
	readonly isSingleNamespaceType: boolean;
}
interface SavedObjectMigrationMap {
	[version: string]: SavedObjectMigration<any, any>;
}
interface SavedObjectMigrationParams<InputAttributes = unknown, MigratedAttributes = unknown> {
	/**
	 * A flag that can defer the migration until either an object is accessed (read) or if there is another non-deferred migration with a higher version.
	 * @default false
	 */
	deferred?: false;
	/** {@inheritDoc SavedObjectMigrationFn} */
	transform: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
}
interface SavedObjectModelDataBackfillResult<DocAttrs = unknown> {
	attributes: Partial<DocAttrs>;
}
interface SavedObjectModelTransformationContext {
	/**
	 * logger instance to be used by the migration handler
	 */
	readonly log: SavedObjectsMigrationLogger;
	/**
	 * The model version this migration is registered for
	 */
	readonly modelVersion: number;
	/**
	 * The namespace type of the savedObject type this migration is registered for
	 */
	readonly namespaceType: SavedObjectsNamespaceType;
}
interface SavedObjectModelTransformationResult<DocAttrs = unknown> {
	document: SavedObjectModelTransformationDoc<DocAttrs>;
}
interface SavedObjectReference {
	name: string;
	type: string;
	id: string;
}
interface SavedObjectReferenceWithContext {
	/** The type of the referenced object */
	type: string;
	/** The ID of the referenced object */
	id: string;
	/** The origin ID of the referenced object (if it has one) */
	originId?: string;
	/** The space(s) that the referenced object exists in */
	spaces: string[];
	/**
	 * References to this object; note that this does not contain _all inbound references everywhere for this object_, it only contains
	 * inbound references for the scope of this operation
	 */
	inboundReferences: Array<{
		/** The type of the object that has the inbound reference */
		type: string;
		/** The ID of the object that has the inbound reference */
		id: string;
		/** The name of the inbound reference */
		name: string;
	}>;
	/** Whether or not this object or reference is missing */
	isMissing?: boolean;
	/** The space(s) that legacy URL aliases matching this type/id exist in */
	spacesWithMatchingAliases?: string[];
	/** The space(s) that objects matching this origin exist in (including this one) */
	spacesWithMatchingOrigins?: string[];
}
interface SavedObjectTypeIdTuple {
	/** The id of the saved object */
	id: string;
	/** The type of the saved object */
	type: string;
}
interface SavedObjectsAccessControlTransforms {
	createImportTransforms: AccessControlImportTransformsFactory;
}
interface SavedObjectsBaseOptions {
	/** Specify the namespace for this operation */
	namespace?: string;
}
interface SavedObjectsBulkCreateObject<T = unknown> {
	/** Optional ID of the object to create (the ID is generated by default) */
	id?: string;
	/** The type of object to create */
	type: string;
	/** The attributes for the object to create */
	attributes: T;
	/** The version string for the object to create */
	version?: string;
	/** Array of references to other saved objects */
	references?: SavedObjectReference[];
	/**
	 * {@inheritDoc SavedObjectsMigrationVersion}
	 * @deprecated
	 */
	migrationVersion?: SavedObjectsMigrationVersion;
	/**
	 * A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
	 * Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
	 * current Kibana version, it will result in an error.
	 *
	 * @remarks
	 * Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
	 * field set and you want to create it again.
	 */
	coreMigrationVersion?: string;
	/** A semver value that is used when migrating documents between Kibana versions. */
	typeMigrationVersion?: string;
	/** Optional ID of the original saved object, if this object's `id` was regenerated */
	originId?: string;
	/**
	 * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
	 * {@link SavedObjectsCreateOptions}.
	 *
	 * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
	 *   including the "All spaces" identifier (`'*'`).
	 * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
	 *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
	 * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
	 */
	initialNamespaces?: string[];
	/**
	 * Flag indicating if a saved object is managed by Kibana (default=false)
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
	/**
	 * The access control settings for the object
	 *
	 * We specifically exclude the owner property, as that is set during the operation
	 * using the current user's profile ID.
	 */
	accessControl?: Pick<SavedObjectAccessControl, "accessMode">;
}
interface SavedObjectsBulkDeleteObject {
	/** The type of the saved object to delete */
	type: string;
	/** The ID of the saved object to delete */
	id: string;
}
interface SavedObjectsBulkDeleteOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
	/**
	 * Force deletion of all objects that exists in multiple namespaces, applied to all objects.
	 */
	force?: boolean;
}
interface SavedObjectsBulkDeleteResponse {
	/** Array of {@link SavedObjectsBulkDeleteStatus} */
	statuses: SavedObjectsBulkDeleteStatus[];
}
interface SavedObjectsBulkDeleteStatus {
	/** The ID of the saved object */
	id: string;
	/** The type of the saved object */
	type: string;
	/** The status of deleting the object: true for deleted, false for error */
	success: boolean;
	/** Reason the object could not be deleted (success is false) */
	error?: SavedObjectError;
}
interface SavedObjectsBulkGetObject {
	/** ID of the object to get */
	id: string;
	/** Type of the object to get */
	type: string;
	/** SavedObject fields to include in the response */
	fields?: string[];
	/**
	 * Optional namespace(s) for the object to be retrieved in. If this is defined, it will supersede the namespace ID that is in the
	 * top-level options.
	 *
	 * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
	 *   including the "All spaces" identifier (`'*'`).
	 * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
	 *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
	 * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
	 */
	namespaces?: string[];
}
interface SavedObjectsBulkResolveObject {
	/** ID of the object to resiolve */
	id: string;
	/** Type of the object to resolve */
	type: string;
}
interface SavedObjectsBulkResolveResponse<T = unknown> {
	/** array of {@link SavedObjectsResolveResponse} */
	resolved_objects: Array<SavedObjectsResolveResponse<T>>;
}
interface SavedObjectsBulkResponse<T = unknown> {
	/** array of saved objects */
	saved_objects: Array<SavedObject<T>>;
}
interface SavedObjectsBulkUpdateObject<T = unknown> extends Pick<SavedObjectsUpdateOptions<T>, "version" | "references"> {
	/** The ID of this Saved Object, guaranteed to be unique for all objects of the same `type` */
	id: string;
	/**  The type of this Saved Object. Each plugin can define it's own custom Saved Object types. */
	type: string;
	/** The data for a Saved Object is stored as an object in the `attributes` property. **/
	attributes: Partial<T>;
	/**
	 * Optional namespace string to use when searching for this object. If this is defined, it will supersede the namespace ID that is in
	 * {@link SavedObjectsBulkUpdateOptions}.
	 *
	 * Note: the default namespace's string representation is `'default'`, and its ID representation is `undefined`.
	 **/
	namespace?: string;
	/**
	 * By default, update will merge the provided attributes with the ones present on the document
	 * (performing a standard partial update). Setting this option to `false` will change the behavior, performing
	 * a "full" update instead, where the provided attributes will fully replace the existing ones.
	 * Defaults to `true`.
	 */
	mergeAttributes?: boolean;
}
interface SavedObjectsBulkUpdateOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
}
interface SavedObjectsBulkUpdateResponse<T = unknown> {
	/** array of {@link SavedObjectsUpdateResponse} */
	saved_objects: Array<SavedObjectsUpdateResponse<T>>;
}
interface SavedObjectsChangeAccessControlObject {
	type: string;
	id: string;
}
interface SavedObjectsChangeAccessControlResponse {
	objects: SavedObjectsChangeAccessControlResponseObject[];
}
interface SavedObjectsChangeAccessControlResponseObject {
	id: string;
	type: string;
	error?: SavedObjectError;
}
interface SavedObjectsChangeAccessModeOptions extends SavedObjectsBaseOptions {
	accessMode?: SavedObjectAccessControl["accessMode"];
}
interface SavedObjectsChangeOwnershipOptions extends SavedObjectsBaseOptions {
	newOwnerProfileUid?: SavedObjectAccessControl["owner"];
}
interface SavedObjectsCheckConflictsObject {
	/** The ID of the object to check */
	id: string;
	/** The type of the object to check */
	type: string;
}
interface SavedObjectsCheckConflictsResponse {
	/** Array of errors (contains the conflicting object ID, type, and error details) */
	errors: Array<{
		id: string;
		type: string;
		error: SavedObjectError;
	}>;
}
interface SavedObjectsClientContract {
	/**
	 * Persists a SavedObject
	 *
	 * @param type - the type of saved object to create
	 * @param attributes - attributes for the saved object
	 * @param options {@link SavedObjectsCreateOptions} - options for the create operation
	 * @returns the created saved object
	 */
	create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions): Promise<SavedObject<T>>;
	/**
	 * Persists multiple documents batched together as a single request
	 *
	 * @param objects - array of objects to create (contains type, attributes, and optional fields )
	 * @param options {@link SavedObjectsCreateOptions} - options for the bulk create operation
	 * @returns the {@link SavedObjectsBulkResponse}
	 */
	bulkCreate<T = unknown>(objects: Array<SavedObjectsBulkCreateObject<T>>, options?: SavedObjectsCreateOptions): Promise<SavedObjectsBulkResponse<T>>;
	/**
	 * Check what conflicts will result when creating a given array of saved objects. This includes "unresolvable conflicts", which are
	 * multi-namespace objects that exist in a different namespace; such conflicts cannot be resolved/overwritten.
	 *
	 * @param objects - array of objects to check (contains ID and type)
	 * @param options {@link SavedObjectsBaseOptions} - options for the check conflicts operation
	 * @returns the {@link SavedObjectsCheckConflictsResponse}
	 */
	checkConflicts(objects: SavedObjectsCheckConflictsObject[], options?: SavedObjectsBaseOptions): Promise<SavedObjectsCheckConflictsResponse>;
	/**
	 * Deletes a SavedObject
	 *
	 * @param type - the type of saved object to delete
	 * @param id - the ID of the saved object to delete
	 * @param options {@link SavedObjectsDeleteOptions} - options for the delete operation
	 */
	delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;
	/**
	 * Deletes multiple SavedObjects batched together as a single request
	 *
	 * @param objects - array of objects to delete (contains ID and type)
	 * @param options {@link SavedObjectsBulkDeleteOptions} - options for the bulk delete operation
	 * @returns the {@link SavedObjectsBulkDeleteResponse}
	 */
	bulkDelete(objects: SavedObjectsBulkDeleteObject[], options?: SavedObjectsBulkDeleteOptions): Promise<SavedObjectsBulkDeleteResponse>;
	/**
	 * Find all SavedObjects matching the search query
	 *
	 * @param options {@link SavedObjectsFindOptions} - options for the find operation
	 * @returns the {@link SavedObjectsFindResponse}
	 *
	 * @remarks When using aggregations via the `aggs` option, be aware that certain Elasticsearch
	 * aggregation types can return data from documents outside the query scope, potentially bypassing
	 * security restrictions like Kibana Spaces. See the `aggs` documentation in {@link SavedObjectsFindOptions}
	 * for a list of aggregations to avoid.
	 */
	find<T = unknown, A = unknown>(options: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T, A>>;
	/**
	 * Performs a raw search against the saved objects indices, returning the raw Elasticsearch response
	 * @param options {@link SavedObjectsSearchOptions} - options for the search operation
	 * @returns the {@link SavedObjectsSearchResponse}
	 *
	 * @remarks While the `search` method is powerful, it can increase code complexity, introduce performance issues and introduce security risks (like injection attacks). Take care to ensure it is implemented correctly for your use case and appropriately stress tested. Carefully consider how you would like to use this method in your plugin to unlock value for users.
	 * @remarks When using aggregations, certain Elasticsearch aggregation types can return data from documents
	 * outside the query scope, potentially bypassing security restrictions like Kibana Spaces. See
	 * {@link SavedObjectsSearchOptions} for a list of aggregations to avoid.
	 * @remarks See tutorial https://docs.elastic.dev/kibana-dev-docs/tutorials/saved-objects-search
	 */
	search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(options: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse<T, A>>;
	/**
	 * Returns an array of objects by id
	 *
	 * @param objects - array of objects to get (contains id, type, and optional fields)
	 * @param options {@link SavedObjectsGetOptions} - options for the bulk get operation
	 * @returns the {@link SavedObjectsBulkResponse}
	 * @example
	 *
	 * bulkGet([
	 *   { id: 'one', type: 'config' },
	 *   { id: 'foo', type: 'index-pattern' }
	 * ])
	 */
	bulkGet<T = unknown>(objects: SavedObjectsBulkGetObject[], options?: SavedObjectsGetOptions): Promise<SavedObjectsBulkResponse<T>>;
	/**
	 * Retrieves a single object
	 *
	 * @param type - The type of the object to retrieve
	 * @param id - The ID of the object to retrieve
	 * @param options {@link SavedObjectsGetOptions} - options for the get operation
	 */
	get<T = unknown>(type: string, id: string, options?: SavedObjectsGetOptions): Promise<SavedObject<T>>;
	/**
	 * Resolves an array of objects by id.
	 *
	 * See documentation for `.resolve`.
	 *
	 * @param objects - an array of objects to resolve (contains id and type)
	 * @param options {@link SavedObjectsResolveOptions} - options for the bulk resolve operation
	 * @returns the {@link SavedObjectsBulkResolveResponse}
	 * @example
	 *
	 * bulkResolve([
	 *   { id: 'one', type: 'config' },
	 *   { id: 'foo', type: 'index-pattern' }
	 * ])
	 *
	 * @note Saved objects that Kibana fails to find are replaced with an error object and an "exactMatch" outcome. The rationale behind the
	 * outcome is that "exactMatch" is the default outcome, and the outcome only changes if an alias is found. This behavior is unique to
	 * `bulkResolve`; the regular `resolve` API will throw an error instead.
	 */
	bulkResolve<T = unknown>(objects: SavedObjectsBulkResolveObject[], options?: SavedObjectsResolveOptions): Promise<SavedObjectsBulkResolveResponse<T>>;
	/**
	 * Resolves a single object.
	 *
	 * After 8.0.0, saved objects are provided a unique ID _across_ spaces.
	 * A subset of existing saved objects may have IDs regenerated while upgrading to 8+.
	 * `.resolve` provides a way for clients with legacy IDs to still retrieve the correct
	 * saved object.
	 *
	 * An example of a client with a "legacy ID" is a bookmarked dashboard in a
	 * non-default space.
	 *
	 * @param type - The type of SavedObject to retrieve
	 * @param id - The ID of the SavedObject to retrieve
	 * @param options {@link SavedObjectsResolveOptions} - options for the resolve operation
	 * @returns the {@link SavedObjectsResolveResponse}
	 */
	resolve<T = unknown>(type: string, id: string, options?: SavedObjectsResolveOptions): Promise<SavedObjectsResolveResponse<T>>;
	/**
	 * Updates an SavedObject
	 *
	 * @param type - The type of SavedObject to update
	 * @param id - The ID of the SavedObject to update
	 * @param attributes - Attributes to update
	 * @param options {@link SavedObjectsUpdateOptions} - options for the update operation
	 * @returns the {@link SavedObjectsUpdateResponse}
	 */
	update<T = unknown>(type: string, id: string, attributes: Partial<T>, options?: SavedObjectsUpdateOptions<T>): Promise<SavedObjectsUpdateResponse<T>>;
	/**
	 * Bulk Updates multiple SavedObject at once
	 *
	 * The savedObjects `bulkUpdate` API will update documents client-side and then reindex the updated documents.
	 * These update operations are done in-memory, and cause memory constraint issues when
	 * updating many objects with large `json` blobs stored in some fields. As such, we recommend against using
	 * `bulkUpdate` for savedObjects that:
	 * - use arrays (as these tend to be large objects)
	 * - store large `json` blobs in some fields
	 *
	 * @param objects - array of objects to update (contains ID, type, attributes, and optional namespace)
	 * @param options {@link SavedObjectsBulkUpdateOptions} - options for the bulkUpdate operation
	 * @returns the {@link SavedObjectsBulkUpdateResponse}
	 */
	bulkUpdate<T = unknown>(objects: Array<SavedObjectsBulkUpdateObject<T>>, options?: SavedObjectsBulkUpdateOptions): Promise<SavedObjectsBulkUpdateResponse<T>>;
	/**
	 * Updates all objects containing a reference to the given {type, id} tuple to remove the said reference.
	 *
	 * @param type - the type of the object to remove references to
	 * @param id - the ID of the object to remove references to
	 * @param options {@link SavedObjectsRemoveReferencesToOptions} - options for the remove references operation
	 * @returns the {@link SavedObjectsRemoveReferencesToResponse}
	 */
	removeReferencesTo(type: string, id: string, options?: SavedObjectsRemoveReferencesToOptions): Promise<SavedObjectsRemoveReferencesToResponse>;
	/**
	 * Opens a Point In Time (PIT) against the indices for the specified Saved Object types.
	 * The returned `id` can then be passed to {@link SavedObjectsClient.find} to search
	 * against that PIT.
	 *
	 * Only use this API if you have an advanced use case that's not solved by the
	 * {@link SavedObjectsClient.createPointInTimeFinder} method.
	 *
	 * @param type - the type or array of types
	 * @param options {@link SavedObjectsOpenPointInTimeOptions} - options for the open PIT for type operation
	 * @returns the {@link SavedObjectsOpenPointInTimeResponse}
	 */
	openPointInTimeForType(type: string | string[], options?: SavedObjectsOpenPointInTimeOptions): Promise<SavedObjectsOpenPointInTimeResponse>;
	/**
	 * Closes a Point In Time (PIT) by ID. This simply proxies the request to ES via the
	 * Elasticsearch client, and is included in the Saved Objects Client as a convenience
	 * for consumers who are using {@link SavedObjectsClient.openPointInTimeForType}.
	 *
	 * Only use this API if you have an advanced use case that's not solved by the
	 * {@link SavedObjectsClient.createPointInTimeFinder} method.
	 *
	 * @param id - the ID of the PIT to close
	 * @param options {@link SavedObjectsClosePointInTimeOptions} - options for the close PIT operation
	 * @returns the {@link SavedObjectsClosePointInTimeResponse}
	 */
	closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions): Promise<SavedObjectsClosePointInTimeResponse>;
	/**
	 * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
	 * large sets of saved objects. We strongly recommend using this API for
	 * any `find` queries that might return more than 1000 saved objects,
	 * however this API is only intended for use in server-side "batch"
	 * processing of objects where you are collecting all objects in memory
	 * or streaming them back to the client.
	 *
	 * Do NOT use this API in a route handler to facilitate paging through
	 * saved objects on the client-side unless you are streaming all of the
	 * results back to the client at once. Because the returned generator is
	 * stateful, you cannot rely on subsequent http requests retrieving new
	 * pages from the same Kibana server in multi-instance deployments.
	 *
	 * The generator wraps calls to {@link SavedObjectsClient.find} and iterates
	 * over multiple pages of results using `_pit` and `search_after`. This will
	 * open a new Point-In-Time (PIT), and continue paging until a set of
	 * results is received that's smaller than the designated `perPage`.
	 *
	 * Once you have retrieved all of the results you need, it is recommended
	 * to call `close()` to clean up the PIT and prevent Elasticsearch from
	 * consuming resources unnecessarily. This is only required if you are
	 * done iterating and have not yet paged through all of the results: the
	 * PIT will automatically be closed for you once you reach the last page
	 * of results, or if the underlying call to `find` fails for any reason.
	 *
	 * @example
	 * ```ts
	 * const findOptions: SavedObjectsCreatePointInTimeFinderOptions = {
	 *   type: 'visualization',
	 *   search: 'foo*',
	 *   perPage: 100,
	 * };
	 *
	 * const finder = savedObjectsClient.createPointInTimeFinder(findOptions);
	 *
	 * const responses: SavedObjectFindResponse[] = [];
	 * for await (const response of finder.find()) {
	 *   responses.push(...response);
	 *   if (doneSearching) {
	 *     await finder.close();
	 *   }
	 * }
	 * ```
	 *
	 * @param findOptions {@link SavedObjectsCreatePointInTimeFinderOptions} - options for the create PIT finder operation
	 * @param dependencies {@link SavedObjectsCreatePointInTimeFinderDependencies} - dependencies for the create PIT finder operation
	 * @returns the created PIT finder
	 */
	createPointInTimeFinder<T = unknown, A = unknown>(findOptions: SavedObjectsCreatePointInTimeFinderOptions, dependencies?: SavedObjectsCreatePointInTimeFinderDependencies): ISavedObjectsPointInTimeFinder<T, A>;
	/**
	 * Gets all references and transitive references of the listed objects. Ignores any object that is not a multi-namespace type.
	 *
	 * @param objects - array of objects to collect references for (contains ID and type)
	 * @param options {@link SavedObjectsCollectMultiNamespaceReferencesOptions} - options for the collect multi namespace references operation
	 * @returns the {@link SavedObjectsCollectMultiNamespaceReferencesResponse}
	 */
	collectMultiNamespaceReferences(objects: SavedObjectsCollectMultiNamespaceReferencesObject[], options?: SavedObjectsCollectMultiNamespaceReferencesOptions): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
	/**
	 * Updates one or more objects to add and/or remove them from specified spaces.
	 *
	 * @param objects - array of objects to update (contains ID, type, and optional internal-only parameters)
	 * @param spacesToAdd - array of spaces each object should be included in
	 * @param spacesToRemove - array of spaces each object should not be included in
	 * @param options {@link SavedObjectsUpdateObjectsSpacesOptions} - options for the update spaces operation
	 * @returns the {@link SavedObjectsUpdateObjectsSpacesResponse}
	 */
	updateObjectsSpaces(objects: SavedObjectsUpdateObjectsSpacesObject[], spacesToAdd: string[], spacesToRemove: string[], options?: SavedObjectsUpdateObjectsSpacesOptions): Promise<SavedObjectsUpdateObjectsSpacesResponse>;
	/**
	 * Returns the namespace associated with the client. If the namespace is the default one, this method returns `undefined`.
	 */
	getCurrentNamespace(): string | undefined;
	/**
	 * Returns a clone of the current Saved Objects client but scoped to the specified namespace.
	 * @param namespace Space to which the client should be scoped to.
	 */
	asScopedToNamespace(namespace: string): SavedObjectsClientContract;
	/**
	 * Changes the ownership of one or more SavedObjects to a new owner passed in the options.
	 *
	 * @param objects - The objects to change ownership for
	 * @param options {@link SavedObjectsChangeAccessControlOptions} - options for the change ownership operation
	 * @returns the {@link SavedObjectsChangeAccessControlResponse}
	 */
	changeOwnership(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeOwnershipOptions): Promise<SavedObjectsChangeAccessControlResponse>;
	/**
	 * Changes the access mode of one or more SavedObjects.
	 * @param objects - The objects to change access mode for
	 * @param options {@link SavedObjectsChangeAccessModeOptions} - options for the change access mode operation
	 * @returns the {@link SavedObjectsChangeAccessControlResponse}
	 */
	changeAccessMode(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeAccessModeOptions): Promise<SavedObjectsChangeAccessControlResponse>;
}
interface SavedObjectsClientProviderOptions {
	/** Array of hidden types to include */
	includedHiddenTypes?: string[];
	/** array of extensions to exclude (ENCRYPTION_EXTENSION_ID | SECURITY_EXTENSION_ID | SPACES_EXTENSION_ID) */
	excludedExtensions?: string[];
}
interface SavedObjectsClosePointInTimeResponse {
	/** If true, all search contexts associated with the PIT id are successfully closed */
	succeeded: boolean;
	/** The number of search contexts that have been successfully closed */
	num_freed: number;
}
interface SavedObjectsCollectMultiNamespaceReferencesObject {
	/** The ID of the object to collect references for */
	id: string;
	/** The type of the object to collect references for */
	type: string;
}
interface SavedObjectsCollectMultiNamespaceReferencesOptions extends SavedObjectsBaseOptions {
	/** Optional purpose used to determine filtering and authorization checks; default is 'collectMultiNamespaceReferences' */
	purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose;
}
interface SavedObjectsCollectMultiNamespaceReferencesResponse {
	/** array of {@link SavedObjectReferenceWithContext} */
	objects: SavedObjectReferenceWithContext[];
}
interface SavedObjectsCreateOptions extends SavedObjectsBaseOptions {
	/** (not recommended) Specify an id for the document */
	id?: string;
	/** Overwrite existing documents (defaults to false) */
	overwrite?: boolean;
	/**
	 * An opaque version number which changes on each successful write operation.
	 * Can be used in conjunction with `overwrite` for implementing optimistic concurrency control.
	 **/
	version?: string;
	/**
	 * {@inheritDoc SavedObjectsMigrationVersion}
	 * @deprecated Use {@link SavedObjectsCreateOptions.typeMigrationVersion} instead.
	 */
	migrationVersion?: SavedObjectsMigrationVersion;
	/**
	 * A semver value that is used when upgrading objects between Kibana versions. If undefined, this will be automatically set to the current
	 * Kibana version when the object is created. If this is set to a non-semver value, or it is set to a semver value greater than the
	 * current Kibana version, it will result in an error.
	 *
	 * @remarks
	 * Do not attempt to set this manually. It should only be used if you retrieved an existing object that had the `coreMigrationVersion`
	 * field set and you want to create it again.
	 */
	coreMigrationVersion?: string;
	/**
	 * A semver value that is used when migrating documents between Kibana versions.
	 */
	typeMigrationVersion?: string;
	/** Array of references to other saved objects */
	references?: SavedObjectReference[];
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
	/** Optional ID of the original saved object, if this object's `id` was regenerated */
	originId?: string;
	/**
	 * Optional initial namespaces for the object to be created in. If this is defined, it will supersede the namespace ID that is in
	 * {@link SavedObjectsCreateOptions}.
	 *
	 * * For shareable object types (registered with `namespaceType: 'multiple'`): this option can be used to specify one or more spaces,
	 *   including the "All spaces" identifier (`'*'`).
	 * * For isolated object types (registered with `namespaceType: 'single'` or `namespaceType: 'multiple-isolated'`): this option can only
	 *   be used to specify a single space, and the "All spaces" identifier (`'*'`) is not allowed.
	 * * For global object types (registered with `namespaceType: 'agnostic'`): this option cannot be used.
	 */
	initialNamespaces?: string[];
	/**
	 * Flag indicating if a saved object is managed by Kibana (default=false)
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
	/**
	 * Access control settings for the create operation.
	 *
	 * These settings will be applied to any of the incoming objects which support access control that
	 * do not already contain the accessControl property. We specifically exclude the owner property,
	 * as that is set during the operation using the current user's profile ID.
	 */
	accessControl?: Pick<SavedObjectAccessControl, "accessMode">;
}
interface SavedObjectsCreatePointInTimeFinderDependencies {
	/** the point-in-time finder client */
	client: SavedObjectsPointInTimeFinderClient;
}
interface SavedObjectsDeleteByNamespaceOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch supports only boolean flag for this operation */
	refresh?: boolean;
}
interface SavedObjectsDeleteOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
	/** Force deletion of an object that exists in multiple namespaces */
	force?: boolean;
}
interface SavedObjectsExportByObjectOptions extends SavedObjectExportBaseOptions {
	/** optional array of objects to export. */
	objects: SavedObjectTypeIdTuple[];
}
interface SavedObjectsExportByTypeOptions extends SavedObjectExportBaseOptions {
	/** array of saved object types. */
	types: string[];
	/** optional array of references to search object for. */
	hasReference?: SavedObjectsFindOptionsReference[];
	/** optional query string to filter exported objects. */
	search?: string;
}
interface SavedObjectsExportTransformContext {
	/**
	 * The request that initiated the export request. Can be used to create scoped
	 * services or client inside the {@link SavedObjectsExportTransform | transformation}
	 */
	request: KibanaRequest;
}
interface SavedObjectsExtensions {
	/** The encryption extension - handles encrypting and decrypting attributes of saved objects */
	encryptionExtension?: ISavedObjectsEncryptionExtension;
	/** The security extension - handles action authorization, audit logging, and space redaction */
	securityExtension?: ISavedObjectsSecurityExtension;
	/** The spaces extension - handles retrieving the current space and retrieving available spaces */
	spacesExtension?: ISavedObjectsSpacesExtension;
}
interface SavedObjectsFindInternalOptions {
	/** This is used for calls internal to the SO domain that need to use a PIT finder but want to prevent extensions from functioning.
	 * We use the SOR's PointInTimeFinder internally when searching for aliases and shared origins for saved objects, but we
	 * need to disable the extensions for that to function correctly.
	 * Before, when we had SOC wrappers, the SOR's PointInTimeFinder did not have any of the wrapper functionality applied.
	 * This disableExtensions internal option preserves that behavior.
	 */
	disableExtensions?: boolean;
}
interface SavedObjectsFindOptions {
	/** the type or types of objects to find */
	type: string | string[];
	/** the page of results to return */
	page?: number;
	/** the number of objects per page */
	perPage?: number;
	/** which field to sort by */
	sortField?: string;
	/** sort order, ascending or descending */
	sortOrder?: SortOrder;
	/**
	 * An array of attributes to fetch and include in the results. If unspecified, all attributes will be fetched.
	 *
	 * The main purpose of this option is to avoid fetching unnecessary heavy fields (e.g blobs) when searching for
	 * savedObjects, for performance purposes.
	 *
	 * Defaults to `undefined` (fetching all fields).
	 *
	 * @example
	 * ```ts
	 * SavedObjects.find({type: 'dashboard', fields: ['name', 'description']})
	 * ```
	 *
	 * @remarks When this option is specified, the savedObjects returned from the API will not
	 *          go through the migration process (as we can't migrate partial documents).
	 *          For this reason, all fields provided to this option should already be present
	 *          in the prior model version of the document's SO type.
	 *          Otherwise, it may lead to inconsistencies during hybrid version cohabitation
	 *          (e.g during an upgrade in serverless) where newly introduced / backfilled fields
	 *          may not necessarily appear in the documents returned from the API when the option is used.
	 */
	fields?: string[];
	/** Search documents using the Elasticsearch Simple Query String syntax. See Elasticsearch Simple Query String `query` argument for more information */
	search?: string;
	/** The fields to perform the parsed query against. See Elasticsearch Simple Query String `fields` argument for more information */
	searchFields?: string[];
	/**
	 * Use the sort values from the previous page to retrieve the next page of results.
	 */
	searchAfter?: SortResults;
	/**
	 * The fields to perform the parsed query against. Unlike the `searchFields` argument, these are expected to be root fields and will not
	 * be modified. If used in conjunction with `searchFields`, both are concatenated together.
	 */
	rootSearchFields?: string[];
	/**
	 * Search for documents having a reference to the specified objects.
	 * Use `hasReferenceOperator` to specify the operator to use when searching for multiple references.
	 */
	hasReference?: SavedObjectsFindOptionsReference | SavedObjectsFindOptionsReference[];
	/**
	 * The operator to use when searching by multiple references using the `hasReference` option. Defaults to `OR`
	 */
	hasReferenceOperator?: "AND" | "OR";
	/**
	 * Search for documents *not* having a reference to the specified objects.
	 * Use `hasNoReferenceOperator` to specify the operator to use when searching for multiple references.
	 */
	hasNoReference?: SavedObjectsFindOptionsReference | SavedObjectsFindOptionsReference[];
	/**
	 * The operator to use when searching by multiple references using the `hasNoReference` option. Defaults to `OR`
	 */
	hasNoReferenceOperator?: "AND" | "OR";
	/**
	 * The search operator to use with the provided filter. Defaults to `OR`
	 */
	defaultSearchOperator?: "AND" | "OR";
	/** filter string for the search query */
	filter?: string | KueryNode;
	/**
	 * A record of aggregations to perform.
	 * The API currently only supports a limited set of metrics and bucket aggregation types.
	 * Additional aggregation types can be contributed to Core.
	 *
	 * @example
	 * Aggregating on SO attribute field
	 * ```ts
	 * const aggs = { latest_version: { max: { field: 'dashboard.attributes.version' } } };
	 * return client.find({ type: 'dashboard', aggs })
	 * ```
	 *
	 * @example
	 * Aggregating on SO root field
	 * ```ts
	 * const aggs = { latest_update: { max: { field: 'dashboard.updated_at' } } };
	 * return client.find({ type: 'dashboard', aggs })
	 * ```
	 *
	 * @remarks
	 * **Security Warning:** Some Elasticsearch aggregations can return data from documents that did not match
	 * the query, potentially bypassing security restrictions like Kibana Spaces. The following aggregation
	 * patterns are problematic and **should be avoided**:
	 *
	 * - **`terms` with `min_doc_count: 0`**: Can return terms from the index that are not in matching documents,
	 *   potentially exposing data from other spaces or unauthorized documents.
	 * - **`global`**: Ignores your search filter and collects data from all documents in the index.
	 * - **`significant_terms`**: Uses a background set for comparisons that by default includes all documents in the index.
	 * - **`significant_text`**: Similar to `significant_terms`, uses background document set.
	 * - **`parent`**: Accesses parent documents which may not match filters.
	 * - **`nested`** / **`reverse_nested`**: May access nested documents outside the currentquery scope.
	 *
	 * When authoring aggregations, ensure you only use aggregation types and configurations that operate
	 * strictly within the scope of documents matching the query.
	 *
	 * @alpha
	 */
	aggs?: Record<string, AggregationsAggregationContainer>;
	/** array of namespaces to search */
	namespaces?: string[];
	/**
	 * This map defines each type to search for, and the namespace(s) to search for the type in; this is only intended to be used by a saved
	 * object client wrapper.
	 * If this is defined, it supersedes the `type` and `namespaces` fields when building the Elasticsearch query.
	 * Any types that are not included in this map will be excluded entirely.
	 * If a type is included but its value is undefined, the operation will search for that type in the Default namespace.
	 */
	typeToNamespacesMap?: Map<string, string[] | undefined>;
	/** An optional ES preference value to be used for the query **/
	preference?: string;
	/**
	 * Search against a specific Point In Time (PIT) that you've opened with {@link SavedObjectsClient.openPointInTimeForType}.
	 */
	pit?: SavedObjectsPitParams;
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
}
interface SavedObjectsFindOptionsReference {
	/** The type of the saved object */
	type: string;
	/** The ID of the saved object */
	id: string;
}
interface SavedObjectsFindResponse<T = unknown, A = unknown> {
	/** aggregations from the search query response */
	aggregations?: A;
	/** array of found saved objects */
	saved_objects: Array<SavedObjectsFindResult<T>>;
	/** the total number of objects */
	total: number;
	/** the number of objects per page */
	per_page: number;
	/** the current page number */
	page: number;
	/** the point-in-time ID (undefined if not applicable) */
	pit_id?: string;
}
interface SavedObjectsFindResult<T = unknown> extends SavedObject<T> {
	/**
	 * The Elasticsearch `_score` of this result.
	 */
	score: number;
	/**
	 * The Elasticsearch `sort` value of this result.
	 *
	 * @remarks
	 * This can be passed directly to the `searchAfter` param in the {@link SavedObjectsFindOptions}
	 * in order to page through large numbers of hits. It is recommended you use this alongside
	 * a Point In Time (PIT) that was opened with {@link SavedObjectsClient.openPointInTimeForType}.
	 *
	 * @example
	 * ```ts
	 * const { id } = await savedObjectsClient.openPointInTimeForType('visualization');
	 * const page1 = await savedObjectsClient.find({
	 *   type: 'visualization',
	 *   sortField: 'updated_at',
	 *   sortOrder: 'asc',
	 *   pit: { id },
	 * });
	 * const lastHit = page1.saved_objects[page1.saved_objects.length - 1];
	 * const page2 = await savedObjectsClient.find({
	 *   type: 'visualization',
	 *   sortField: 'updated_at',
	 *   sortOrder: 'asc',
	 *   pit: { id: page1.pit_id },
	 *   searchAfter: lastHit.sort,
	 * });
	 * await savedObjectsClient.closePointInTime(page2.pit_id);
	 * ```
	 */
	sort?: SortResults;
}
interface SavedObjectsFullModelVersion {
	/**
	 * The list of changes associated with this version.
	 *
	 * Model version changes are defined via low-level components, allowing to use composition
	 * to describe the list of changes bound to a given version.
	 *
	 * @remark Having multiple changes of the same type in a version's list of change is supported
	 *         by design to allow merging different sources.
	 *
	 * @example Adding a new indexed field with a default value
	 * ```ts
	 * const version1: SavedObjectsModelVersion = {
	 *   changes: [
	 *     {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         someNewField: { type: 'text' },
	 *       },
	 *     },
	 *     {
	 *       type: 'data_backfill',
	 *       backfillFn: (doc) => {
	 *         return { attributes: { someNewField: 'some default value' } };
	 *       },
	 *     },
	 *   ],
	 * };
	 * ```
	 *
	 * @example A version with multiple mappings addition coming from different changes
	 * ```ts
	 * const version1: SavedObjectsModelVersion = {
	 *   changes: [
	 *     {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         someNewField: { type: 'text' },
	 *       },
	 *     },
	 *    {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         anotherNewField: { type: 'text' },
	 *       },
	 *     },
	 *   ],
	 * };
	 * ```
	 *
	 * See {@link SavedObjectsModelChange | changes} for more information and examples.
	 */
	changes: SavedObjectsModelChange[];
	/**
	 * The {@link SavedObjectsModelVersionSchemaDefinitions | schemas} associated with this version.
	 *
	 * Schemas are used to validate / convert the shape and/or content of the documents at various stages of their usages.
	 * Required for rollback safety
	 */
	schemas: SavedObjectsFullModelVersionSchemaDefinitions;
}
interface SavedObjectsFullModelVersionSchemaDefinitions {
	/**
	 * The schema applied when retrieving documents of a higher version from the cluster.
	 * Used for multi-version compatibility in managed environments.
	 *
	 * When retrieving a savedObject document from an index, if the version of the document
	 * is higher than the latest version known of the Kibana instance, the document will go
	 * through the `forwardCompatibility` schema of the associated model version.
	 *
	 * E.g a Kibana instance with model version `2` for type `foo` types fetches a `foo` document
	 * at model version `3`. The document will then go through the `forwardCompatibility`
	 * of the model version 2 (if present).
	 *
	 * See {@link SavedObjectModelVersionForwardCompatibilitySchema} for more info.
	 */
	forwardCompatibility: SavedObjectModelVersionForwardCompatibilitySchema;
	/**
	 * The schema applied when creating a document of the current version
	 * Allows for validating properties using @kbn/config-schema validations
	 */
	create: SavedObjectsValidationSpec;
}
interface SavedObjectsGetOptions extends SavedObjectsBaseOptions {
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
}
interface SavedObjectsImportActionRequiredWarning {
	type: "action_required";
	/** The translated message to display to the user. */
	message: string;
	/** The path (without the basePath) that the user should be redirect to address this warning. */
	actionPath: string;
	/** An optional label to use for the link button. If unspecified, a default label will be used. */
	buttonLabel?: string;
}
interface SavedObjectsImportAmbiguousConflictError {
	type: "ambiguous_conflict";
	destinations: Array<{
		id: string;
		title?: string;
		updatedAt?: string;
	}>;
}
interface SavedObjectsImportConflictError {
	type: "conflict";
	destinationId?: string;
}
interface SavedObjectsImportFailure {
	id: string;
	type: string;
	meta: {
		title?: string;
		icon?: string;
	};
	/**
	 * If `overwrite` is specified, an attempt was made to overwrite an existing object.
	 */
	overwrite?: boolean;
	managed?: boolean;
	error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError | SavedObjectsImportUnsupportedTypeError | SavedObjectsImportMissingReferencesError | SavedObjectsImportUnknownError | SavedObjectsImportUnexpectedAccessControlMetadataError;
}
interface SavedObjectsImportHookResult {
	/**
	 * An optional list of warnings to display in the UI when the import succeeds.
	 */
	warnings?: SavedObjectsImportWarning[];
}
interface SavedObjectsImportMissingReferencesError {
	type: "missing_references";
	references: Array<{
		type: string;
		id: string;
	}>;
}
interface SavedObjectsImportOptions {
	/** The stream of {@link SavedObject | saved objects} to import */
	readStream: Stream.Readable;
	/** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
	overwrite: boolean;
	/** if specified, will import in given namespace, else will import as global object */
	namespace?: string;
	/** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
	createNewCopies: boolean;
	/** Refresh setting, defaults to `wait_for` */
	refresh?: boolean | "wait_for";
	/**
	 * If true, Kibana will apply various adjustments to the data that's being imported to maintain compatibility between
	 * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
	 */
	compatibilityMode?: boolean;
	/**
	 * If true, will import as a managed object, else will import as not managed.
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
}
interface SavedObjectsImportResponse {
	success: boolean;
	successCount: number;
	successResults?: SavedObjectsImportSuccess[];
	warnings: SavedObjectsImportWarning[];
	errors?: SavedObjectsImportFailure[];
}
interface SavedObjectsImportRetry {
	type: string;
	id: string;
	overwrite: boolean;
	/**
	 * The object ID that will be created or overwritten. If not specified, the `id` field will be used.
	 */
	destinationId?: string;
	replaceReferences: Array<{
		type: string;
		from: string;
		to: string;
	}>;
	/**
	 * If `createNewCopy` is specified, the new object has a new (undefined) origin ID. This is only needed for the case where
	 * `createNewCopies` mode is disabled and ambiguous source conflicts are detected.
	 */
	createNewCopy?: boolean;
	/**
	 * If `ignoreMissingReferences` is specified, reference validation will be skipped for this object.
	 */
	ignoreMissingReferences?: boolean;
}
interface SavedObjectsImportSimpleWarning {
	type: "simple";
	/** The translated message to display to the user */
	message: string;
}
interface SavedObjectsImportSuccess {
	id: string;
	type: string;
	/**
	 * If `destinationId` is specified, the new object has a new ID that is different from the import ID.
	 */
	destinationId?: string;
	/**
	 * @deprecated Can be removed when https://github.com/elastic/kibana/issues/91615 is done.
	 * If `createNewCopy` is specified, the new object has a new (undefined) origin ID. This is only needed for the case where
	 * `createNewCopies` mode is disabled and ambiguous source conflicts are detected. When `createNewCopies` mode is permanently enabled,
	 * this field will be redundant and can be removed.
	 */
	createNewCopy?: boolean;
	meta: {
		title?: string;
		icon?: string;
	};
	/**
	 * If `overwrite` is specified, this object overwrote an existing one (or will do so, in the case of a pending resolution).
	 */
	overwrite?: boolean;
	/**
	 * Flag indicating if a saved object is managed by Kibana (default=false)
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
}
interface SavedObjectsImportUnexpectedAccessControlMetadataError {
	type: "unexpected_access_control_metadata";
}
interface SavedObjectsImportUnknownError {
	type: "unknown";
	message: string;
	statusCode: number;
}
interface SavedObjectsImportUnsupportedTypeError {
	type: "unsupported_type";
}
interface SavedObjectsImporterOptions {
	/** Overwrites the maximum number of saved objects that could be imported */
	importSizeLimit?: number;
}
interface SavedObjectsIncrementCounterField {
	/** The field name to increment the counter by.*/
	fieldName: string;
	/** The number to increment the field by (defaults to 1).*/
	incrementBy?: number;
}
interface SavedObjectsIncrementCounterOptions<Attributes = unknown> extends SavedObjectsBaseOptions {
	/**
	 * (default=false) If true, sets all the counter fields to 0 if they don't
	 * already exist. Existing fields will be left as-is and won't be incremented.
	 */
	initialize?: boolean;
	/**
	 * {@link SavedObjectsMigrationVersion}
	 * @deprecated
	 */
	migrationVersion?: SavedObjectsMigrationVersion;
	/**
	 * A semver value that is used when migrating documents between Kibana versions.
	 */
	typeMigrationVersion?: string;
	/**
	 * (default='wait_for') The Elasticsearch refresh setting for this
	 * operation. See {@link MutatingOperationRefreshSetting}
	 */
	refresh?: MutatingOperationRefreshSetting;
	/**
	 * Attributes to use when upserting the document if it doesn't exist.
	 */
	upsertAttributes?: Attributes;
	/**
	 * Flag indicating if a saved object is managed by Kibana (default=false).
	 * Only used when upserting a saved object. If the saved object already
	 * exist this option has no effect.
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
}
interface SavedObjectsMappingProperties {
	[field: string]: SavedObjectsFieldMapping;
}
interface SavedObjectsMigrationLogger {
	debug: (msg: string) => void;
	info: (msg: string) => void;
	warn: (msg: string) => void;
	error: <Meta extends LogMeta = LogMeta>(msg: string, meta: Meta) => void;
}
interface SavedObjectsMigrationVersion {
	/** The plugin name and version string */
	[pluginName: string]: string;
}
interface SavedObjectsModelDataBackfillChange<PreviousAttributes = any, NewAttributes = any> {
	type: "data_backfill";
	/**
	 * The backfill function to run.
	 */
	backfillFn: SavedObjectModelDataBackfillFn<PreviousAttributes, NewAttributes>;
}
interface SavedObjectsModelDataRemovalChange {
	type: "data_removal";
	/**
	 * The list of attribute paths to remove.
	 */
	removedAttributePaths: string[];
}
interface SavedObjectsModelMappingsAdditionChange {
	type: "mappings_addition";
	/**
	 * The new mappings introduced in this version.
	 */
	addedMappings: SavedObjectsMappingProperties;
}
interface SavedObjectsModelMappingsDeprecationChange {
	type: "mappings_deprecation";
	/**
	 * A list of paths to mappings to flag as deprecated.
	 */
	deprecatedMappings: string[];
}
interface SavedObjectsModelUnsafeTransformChange {
	type: "unsafe_transform";
	/**
	 * The transform function to execute.
	 */
	transformFn: (typeSafeGuard: <PreviousAttributes, NewAttributes>(fn: SavedObjectModelUnsafeTransformFn<PreviousAttributes, NewAttributes>) => SavedObjectModelTransformationFn) => SavedObjectModelTransformationFn;
}
interface SavedObjectsModelVersion {
	/**
	 * The list of changes associated with this version.
	 *
	 * Model version changes are defined via low-level components, allowing to use composition
	 * to describe the list of changes bound to a given version.
	 *
	 * @remark Having multiple changes of the same type in a version's list of change is supported
	 *         by design to allow merging different sources.
	 *
	 * @example Adding a new indexed field with a default value
	 * ```ts
	 * const version1: SavedObjectsModelVersion = {
	 *   changes: [
	 *     {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         someNewField: { type: 'text' },
	 *       },
	 *     },
	 *     {
	 *       type: 'data_backfill',
	 *       backfillFn: (doc) => {
	 *         return { attributes: { someNewField: 'some default value' } };
	 *       },
	 *     },
	 *   ],
	 * };
	 * ```
	 *
	 * @example A version with multiple mappings addition coming from different changes
	 * ```ts
	 * const version1: SavedObjectsModelVersion = {
	 *   changes: [
	 *     {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         someNewField: { type: 'text' },
	 *       },
	 *     },
	 *    {
	 *       type: 'mappings_addition',
	 *       addedMappings: {
	 *         anotherNewField: { type: 'text' },
	 *       },
	 *     },
	 *   ],
	 * };
	 * ```
	 *
	 * See {@link SavedObjectsModelChange | changes} for more information and examples.
	 */
	changes: SavedObjectsModelChange[];
	/**
	 * The {@link SavedObjectsModelVersionSchemaDefinitions | schemas} associated with this version.
	 *
	 * Schemas are used to validate / convert the shape and/or content of the documents at various stages of their usages.
	 */
	schemas?: SavedObjectsModelVersionSchemaDefinitions;
}
interface SavedObjectsModelVersionSchemaDefinitions {
	/**
	 * The schema applied when retrieving documents of a higher version from the cluster.
	 * Used for multi-version compatibility in managed environments.
	 *
	 * When retrieving a savedObject document from an index, if the version of the document
	 * is higher than the latest version known of the Kibana instance, the document will go
	 * through the `forwardCompatibility` schema of the associated model version.
	 *
	 * E.g a Kibana instance with model version `2` for type `foo` types fetches a `foo` document
	 * at model version `3`. The document will then go through the `forwardCompatibility`
	 * of the model version 2 (if present).
	 *
	 * See {@link SavedObjectModelVersionForwardCompatibilitySchema} for more info.
	 */
	forwardCompatibility?: SavedObjectModelVersionForwardCompatibilitySchema;
	/**
	 * The schema applied when creating a document of the current version
	 * Allows for validating properties using @kbn/config-schema validations
	 */
	create?: SavedObjectsValidationSpec;
}
interface SavedObjectsOpenPointInTimeOptions {
	/**
	 * Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`.
	 */
	keepAlive?: string;
	/**
	 * An optional ES preference value to be used for the query.
	 */
	preference?: string;
	/**
	 * An optional list of namespaces to be used when opening the PIT.
	 *
	 * When the spaces plugin is enabled:
	 *  - this will default to the user's current space (as determined by the URL)
	 *  - if specified, the user's current space will be ignored
	 *  - `['*']` will search across all available spaces
	 */
	namespaces?: string[];
}
interface SavedObjectsOpenPointInTimeResponse {
	/** PIT ID returned from ES */
	id: string;
}
interface SavedObjectsPitParams {
	/** The ID of point-in-time */
	id: string;
	/** Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`. */
	keepAlive?: string;
}
interface SavedObjectsRawDoc {
	_id: string;
	_source: SavedObjectsRawDocSource;
	_seq_no?: number;
	_primary_term?: number;
}
interface SavedObjectsRawDocParseOptions {
	/**
	 * Optional setting to allow for lax handling of the raw document ID and namespace field. This is needed when a previously
	 * single-namespace object type is converted to a multi-namespace object type, and it is only intended to be used during upgrade
	 * migrations.
	 *
	 * If not specified, the default treatment is `strict`.
	 */
	namespaceTreatment?: "strict" | "lax";
	/**
	 * Optional setting to allow compatible handling of the `migrationVersion` field.
	 * This is needed to return the `migrationVersion` field in the same format as it was before migrating to the `typeMigrationVersion` property.
	 *
	 * @default 'raw'
	 */
	migrationVersionCompatibility?: "compatible" | "raw";
}
interface SavedObjectsRawDocSource {
	type: string;
	namespace?: string;
	namespaces?: string[];
	migrationVersion?: SavedObjectsMigrationVersion;
	typeMigrationVersion?: string;
	updated_at?: string;
	created_at?: string;
	created_by?: string;
	references?: SavedObjectReference[];
	originId?: string;
	managed?: boolean;
	accessControl?: SavedObjectAccessControl;
	[typeMapping: string]: any;
}
interface SavedObjectsRemoveReferencesToOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch Refresh setting for this operation. Defaults to `true` */
	refresh?: boolean;
}
interface SavedObjectsRemoveReferencesToResponse extends SavedObjectsBaseOptions {
	/** The number of objects that have been updated by this operation */
	updated: number;
}
interface SavedObjectsRepositoryFactory {
	/**
	 * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
	 * uses the credentials from the passed in request to authenticate with
	 * Elasticsearch.
	 *
	 * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
	 * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
	 */
	createScopedRepository: (req: KibanaRequest, includedHiddenTypes?: string[], extensions?: SavedObjectsExtensions) => ISavedObjectsRepository;
	/**
	 * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
	 * uses the internal Kibana user for authenticating with Elasticsearch.
	 *
	 * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
	 * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
	 */
	createInternalRepository: (includedHiddenTypes?: string[], extensions?: SavedObjectsExtensions) => ISavedObjectsRepository;
}
interface SavedObjectsRequestHandlerContext {
	client: SavedObjectsClientContract;
	typeRegistry: ISavedObjectTypeRegistry;
	getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
	getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
	getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
}
interface SavedObjectsResolveImportErrorsOptions {
	/** The stream of {@link SavedObject | saved objects} to resolve errors from */
	readStream: Stream.Readable;
	/** saved object import references to retry */
	retries: SavedObjectsImportRetry[];
	/** if specified, will import in given namespace */
	namespace?: string;
	/** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
	createNewCopies: boolean;
	/**
	 * If true, Kibana will apply various adjustments to the data that's being retried to import to maintain compatibility between
	 * different Kibana versions (e.g. generate legacy URL aliases for all imported objects that have to change IDs).
	 */
	compatibilityMode?: boolean;
	/**
	 * If true, will import as a managed object, else will import as not managed.
	 *
	 * This can be leveraged by applications to e.g. prevent edits to a managed
	 * saved object. Instead, users can be guided to create a copy first and
	 * make their edits to the copy.
	 */
	managed?: boolean;
}
interface SavedObjectsResolveOptions extends SavedObjectsBaseOptions {
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
}
interface SavedObjectsResolveResponse<T = unknown> {
	/**
	 * The saved object that was found.
	 */
	saved_object: SavedObject<T>;
	/**
	 * The outcome for a successful `resolve` call is one of the following values:
	 *
	 *  * `'exactMatch'` -- One document exactly matched the given ID.
	 *  * `'aliasMatch'` -- One document with a legacy URL alias matched the given ID; in this case the `saved_object.id` field is different
	 *    than the given ID.
	 *  * `'conflict'` -- Two documents matched the given ID, one was an exact match and another with a legacy URL alias; in this case the
	 *    `saved_object` object is the exact match, and the `saved_object.id` field is the same as the given ID.
	 */
	outcome: "exactMatch" | "aliasMatch" | "conflict";
	/**
	 * The ID of the object that the legacy URL alias points to.
	 *
	 * **Note:** this field is *only* included when an alias was found (in other words, when the outcome is `'aliasMatch'` or `'conflict'`).
	 */
	alias_target_id?: string;
	/**
	 * The reason this alias was created.
	 *
	 * Currently this is used to determine whether or not a toast should be shown when a user is redirected from a legacy URL; if the alias
	 * was created because of saved object conversion, then we will display a toast telling the user that the object has a new URL.
	 *
	 * **Note:** this field is *only* included when an alias was found (in other words, when the outcome is `'aliasMatch'` or `'conflict'`).
	 */
	alias_purpose?: "savedObjectConversion" | "savedObjectImport";
}
interface SavedObjectsSearchOptions extends Omit<estypes.SearchRequest, "index"> {
	/** The type or types of objects to find. */
	type: string | string[];
	/** The namespaces to search within. */
	namespaces: string[];
}
interface SavedObjectsServiceSetup {
	/**
	 * Set the default {@link SavedObjectsClientFactoryProvider | factory provider} for creating Saved Objects clients.
	 * Only one provider can be set, subsequent calls to this method will fail.
	 */
	setClientFactoryProvider: (clientFactoryProvider: SavedObjectsClientFactoryProvider) => void;
	/**
	 * Sets the {@link SavedObjectsEncryptionExtensionFactory encryption extension factory}.
	 */
	setEncryptionExtension: (factory: SavedObjectsEncryptionExtensionFactory) => void;
	/**
	 * Sets the {@link SavedObjectsSecurityExtensionFactory security extension factory}.
	 */
	setSecurityExtension: (factory: SavedObjectsSecurityExtensionFactory) => void;
	/**
	 * Sets the {@link SavedObjectsSpacesExtensionFactory spaces extension factory}.
	 */
	setSpacesExtension: (factory: SavedObjectsSpacesExtensionFactory) => void;
	/**
	 * Sets the {@link SavedObjectsAccessControlTransforms access control transforms}.
	 */
	setAccessControlTransforms: (transforms: SavedObjectsAccessControlTransforms) => void;
	/**
	 * Register a {@link SavedObjectsType | savedObjects type} definition.
	 *
	 * See the {@link SavedObjectsTypeMappingDefinition | mappings format} and
	 * {@link SavedObjectMigrationMap | migration format} for more details about these.
	 *
	 * @example
	 * ```ts
	 * // src/plugins/my_plugin/server/saved_objects/my_type.ts
	 * import { SavedObjectsType } from 'src/core/server';
	 * import * as migrations from './migrations';
	 * import * as schemas from './schemas';
	 *
	 * export const myType: SavedObjectsType = {
	 *   name: 'MyType',
	 *   hidden: false,
	 *   namespaceType: 'multiple',
	 *   mappings: {
	 *     properties: {
	 *       textField: {
	 *         type: 'text',
	 *       },
	 *       boolField: {
	 *         type: 'boolean',
	 *       },
	 *     },
	 *   },
	 *   migrations: {
	 *     '2.0.0': migrations.migrateToV2,
	 *     '2.1.0': migrations.migrateToV2_1
	 *   },
	 *   schemas: {
	 *     '2.0.0': schemas.v2,
	 *     '2.1.0': schemas.v2_1,
	 *   },
	 * };
	 *
	 * // src/plugins/my_plugin/server/plugin.ts
	 * import { SavedObjectsClient, CoreSetup } from 'src/core/server';
	 * import { myType } from './saved_objects';
	 *
	 * export class Plugin() {
	 *   setup: (core: CoreSetup) => {
	 *     core.savedObjects.registerType(myType);
	 *   }
	 * }
	 * ```
	 */
	registerType: <Attributes = unknown>(type: SavedObjectsType<Attributes>) => void;
	/**
	 * Returns the default index used for saved objects.
	 */
	getDefaultIndex: () => string;
	/**
	 * Returns whether the access control feature is enabled for saved objects.
	 */
	isAccessControlEnabled: () => boolean;
}
interface SavedObjectsServiceStart {
	/**
	 * Creates a {@link SavedObjectsClientContract | Saved Objects client} that
	 * uses the credentials from the passed in request to authenticate with
	 * Elasticsearch.
	 *
	 * A client that is already scoped to the incoming request is also exposed
	 * from the route handler context see {@link RequestHandlerContext}.
	 */
	getScopedClient: (req: KibanaRequest, options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
	/**
	 * Creates a {@link SavedObjectsClientContract | Saved Objects client} that
	 * uses the internal Kibana user for authenticating with Elasticsearch.
	 * This client supports extensions (encryption, spaces) but bypasses user-based security.
	 *
	 * @param options - Options for configuring the internal client.
	 *
	 * @remarks
	 * This is intended for internal operations that need extension support
	 * (like encryption) but should not be scoped to a specific user.
	 *
	 * **Security Note**: The security extension is automatically excluded to prevent
	 * user-based filtering. Use this only for operations that should run with
	 * system-level privileges.
	 *
	 * Use this instead of creating fake requests to work around security scoping.
	 *
	 * @example
	 * ```typescript
	 * // Basic usage
	 * const client = savedObjects.getUnsafeInternalClient();
	 *
	 * // With hidden types
	 * const client = savedObjects.getUnsafeInternalClient({
	 *   includedHiddenTypes: ['fleet-agent-policies']
	 * });
	 * ```
	 */
	getUnsafeInternalClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
	/**
	 * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
	 * uses the credentials from the passed in request to authenticate with
	 * Elasticsearch.
	 *
	 * @param req - The request to create the scoped repository from.
	 * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
	 * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
	 *
	 * @remarks
	 * Prefer using `getScopedClient`. This should only be used when using methods
	 * not exposed on {@link SavedObjectsClientContract}
	 */
	createScopedRepository: (req: KibanaRequest, includedHiddenTypes?: string[], extensions?: SavedObjectsExtensions) => ISavedObjectsRepository;
	/**
	 * Creates a {@link ISavedObjectsRepository | Saved Objects repository} that
	 * uses the internal Kibana user for authenticating with Elasticsearch.
	 *
	 * @param includedHiddenTypes - A list of additional hidden types the repository should have access to.
	 * @param extensions - Extensions that the repository should use (for encryption, security, and spaces).
	 */
	createInternalRepository: (includedHiddenTypes?: string[], extensions?: SavedObjectsExtensions) => ISavedObjectsRepository;
	/**
	 * Creates a {@link ISavedObjectsSerializer | serializer} that is aware of all registered types.
	 */
	createSerializer: () => ISavedObjectsSerializer;
	/**
	 * Creates an {@link ISavedObjectsExporter | exporter} bound to given client.
	 */
	createExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
	/**
	 * Creates an {@link ISavedObjectsImporter | importer} bound to given client.
	 */
	createImporter: (client: SavedObjectsClientContract, options?: SavedObjectsImporterOptions) => ISavedObjectsImporter;
	/**
	 * Returns the {@link ISavedObjectTypeRegistry | registry} containing all registered
	 * {@link SavedObjectsType | saved object types}
	 */
	getTypeRegistry: () => ISavedObjectTypeRegistry;
	/**
	 * Returns the (alias to the) index that the specified saved object type is stored in.
	 *
	 * @param type The SO type to retrieve the index/alias for.
	 */
	getIndexForType: (type: string) => string;
	/**
	 * Returns the (alias to the) index that the specified saved object type is stored in.
	 *
	 * @remark if multiple types are living in the same index, duplicates will be removed.
	 * @param types The SO types to retrieve the index/alias for.
	 */
	getIndicesForTypes: (types: string[]) => string[];
	/**
	 * Returns the default index used for saved objects.
	 */
	getDefaultIndex: () => string;
	/**
	 * Returns all (aliases to) kibana system indices used for saved object storage.
	 *
	 * @remarks Only the indices effectively present in the current running environment will be returned.
	 */
	getAllIndices: () => string[];
}
interface SavedObjectsType<Attributes = any> {
	/**
	 * The name of the type, which is also used as the internal id.
	 */
	name: string;
	/**
	 * The attribute path to the saved object's name
	 */
	nameAttribute?: string;
	/**
	 * Is the type hidden by default. If true, repositories will not have access to this type unless explicitly
	 * declared as an `extraType` when creating the repository.
	 * It is recommended to hide the type for better backward compatibility.
	 * The hidden types will not be automatically exposed via the HTTP API.
	 * Therefore, that should prevent unexpected behavior in the client code, as all the interactions will be done via the plugin API.
	 *
	 * Hidden types must be listed to be accessible by the client.
	 *
	 * (await context.core).savedObjects.getClient({ includeHiddenTypes: [MY_PLUGIN_HIDDEN_SAVED_OBJECT_TYPE] })
	 *
	 * See {@link SavedObjectsServiceStart.createInternalRepository | createInternalRepository}.
	 *
	 */
	hidden: boolean;
	/**
	 * Is the type hidden from the http APIs. If `hiddenFromHttpApis:true`, repositories will have access to the type but the type is not exposed via the HTTP APIs.
	 * It is recommended to hide types registered with 'hidden=false' from the httpApis for backward compatibility in the HTTP layer.
	 *
	 * @remarks Setting this property for hidden types is not recommended and will fail validation if set to `false`.
	 * @internalRemarks Using 'hiddenFromHttpApis' is an alternative to registering types as `hidden:true` to hide a type from the HTTP APIs without effecting repositories access.
	 */
	hiddenFromHttpApis?: boolean;
	/**
	 * The {@link SavedObjectsNamespaceType | namespace type} for the type.
	 */
	namespaceType: SavedObjectsNamespaceType;
	/**
	 * If defined, the type instances will be stored in the given index instead of the default one.
	 */
	indexPattern?: string;
	/**
	 * If defined, will be used to convert the type to an alias.
	 */
	convertToAliasScript?: string;
	/**
	 * If defined, allows a type to exclude unneeded documents from the migration process and effectively be deleted.
	 * See {@link SavedObjectTypeExcludeFromUpgradeFilterHook} for more details.
	 */
	excludeOnUpgrade?: SavedObjectTypeExcludeFromUpgradeFilterHook;
	/**
	 * The {@link SavedObjectsTypeMappingDefinition | mapping definition} for the type.
	 */
	mappings: SavedObjectsTypeMappingDefinition;
	/**
	 * An optional map of {@link SavedObjectMigrationFn | migrations} or a function returning a map of
	 * {@link SavedObjectMigrationFn | migrations} to be used to migrate the type.
	 *
	 * @deprecated Use {@link SavedObjectsType.modelVersions | modelVersions} for all future migrations instead. We have no plans
	 * to remove legacy migrations at this point, so there's no need to migrate existing migrations to model versions.
	 */
	migrations?: SavedObjectMigrationMap | (() => SavedObjectMigrationMap);
	/**
	 * An optional schema that can be used to validate the attributes of the type.
	 *
	 * When provided, calls to {@link SavedObjectsClient.create | create} will be validated against this schema.
	 *
	 * See {@link SavedObjectsValidationMap} for more details.
	 * @deprecated Use {@link SavedObjectsType.modelVersions | modelVersions} instead.
	 */
	schemas?: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
	/**
	 * If defined, objects of this type will be converted to a 'multiple' or 'multiple-isolated' namespace type when migrating to
	 * this version.
	 *
	 * Requirements:
	 *
	 *  1. This string value must be a valid semver version
	 *  2. This type must have previously specified {@link SavedObjectsNamespaceType | `namespaceType: 'single'`}
	 *  3. This type must also specify {@link SavedObjectsNamespaceType | `namespaceType: 'multiple'`} *or*
	 *     {@link SavedObjectsNamespaceType | `namespaceType: 'multiple-isolated'`}
	 *
	 * Example of a single-namespace type in 7.12:
	 *
	 * ```ts
	 * {
	 *   name: 'foo',
	 *   hidden: false,
	 *   namespaceType: 'single',
	 *   mappings: {...}
	 * }
	 * ```
	 *
	 * Example after converting to a multi-namespace (isolated) type in 8.0:
	 *
	 * ```ts
	 * {
	 *   name: 'foo',
	 *   hidden: false,
	 *   namespaceType: 'multiple-isolated',
	 *   mappings: {...},
	 *   convertToMultiNamespaceTypeVersion: '8.0.0'
	 * }
	 * ```
	 *
	 * Example after converting to a multi-namespace (shareable) type in 8.1:
	 *
	 * ```ts
	 * {
	 *   name: 'foo',
	 *   hidden: false,
	 *   namespaceType: 'multiple',
	 *   mappings: {...},
	 *   convertToMultiNamespaceTypeVersion: '8.0.0'
	 * }
	 * ```
	 *
	 * Note: migration function(s) can be optionally specified for any of these versions and will not interfere with the conversion process.
	 * @deprecated Converting to multi-namespace clashes with the ZDT requirement for serverless
	 */
	convertToMultiNamespaceTypeVersion?: string;
	/**
	 * An optional {@link SavedObjectsTypeManagementDefinition | saved objects management section} definition for the type.
	 */
	management?: SavedObjectsTypeManagementDefinition<Attributes>;
	/**
	 * A map of model versions associated with this type.
	 *
	 * Model versions supersede the {@link SavedObjectsType.migrations | migrations} (and {@link SavedObjectsType.schemas | schemas}) APIs
	 * by exposing an unified way of describing the changes of shape or data of the type.
	 *
	 * Model versioning is decoupled from Kibana versioning, and isolated between types.
	 * Model versions are identified by a single numeric value, starting at `1` and without gaps.
	 *
	 * Please refer to {@link SavedObjectsModelVersion} for more details on the model version API.
	 *
	 * @example A **valid** versioning would be:
	 *
	 * ```ts
	 * {
	 *   name: 'foo',
	 *   // other mandatory attributes...
	 *   modelVersions: {
	 *     '1': modelVersion1,
	 *     '2': modelVersion2,
	 *     '3': modelVersion3,
	 *   }
	 * }
	 * ```
	 *
	 * @example An **invalid** versioning would be:
	 *
	 * ```ts
	 * {
	 *   name: 'foo',
	 *   // other mandatory attributes...
	 *   modelVersions: {
	 *     '1': modelVersion1,
	 *     '3': modelVersion3, // ERROR, no model version 2
	 *     '3.1': modelVersion31, // ERROR, model version is a single numeric value
	 *   }
	 * }
	 * ```
	 */
	modelVersions?: SavedObjectsModelVersionMap | SavedObjectsModelVersionMapProvider;
	/**
	 * Function returning the title to display in the management table.
	 * If not defined, will use the object's type and id to generate a label.
	 */
	getTitle?: (savedObject: Attributes) => string;
	/**
	 * If defined and set to `true`, this saved object type will support access control functionality.
	 *
	 * When enabled, objects of this type can have an `accessControl` property containing:
	 * - `owner`: The ID of the user who owns this object
	 * - `accessMode`: Access mode setting, supports 'write_restricted' or 'default'.
	 *
	 * This property works in conjunction with the SavedObjectAccessControl interface defined
	 * in server_types.ts.
	 */
	supportsAccessControl?: boolean;
}
interface SavedObjectsTypeManagementDefinition<Attributes = any> {
	/**
	 * Is the type importable or exportable. Defaults to `false`.
	 */
	importableAndExportable?: boolean;
	/**
	 * When specified, will be used instead of the type's name in SO management section's labels.
	 */
	displayName?: string;
	/**
	 * When set to false, the type will not be listed or searchable in the SO management section.
	 * Main usage of setting this property to false for a type is when objects from the type should
	 * be included in the export via references or export hooks, but should not directly appear in the SOM.
	 * Defaults to `true`.
	 *
	 * @remarks `importableAndExportable` must be `true` to specify this property.
	 */
	visibleInManagement?: boolean;
	/**
	 * The default search field to use for this type. Defaults to `id`.
	 */
	defaultSearchField?: string;
	/**
	 * The eui icon name to display in the management table.
	 * If not defined, the default icon will be used.
	 */
	icon?: string;
	/**
	 * Function returning the title to display in the management table.
	 * If not defined, will use the object's type and id to generate a label.
	 */
	getTitle?: (savedObject: SavedObject<Attributes>) => string;
	/**
	 * Function returning the url to use to redirect to the editing page of this object.
	 * If not defined, editing will not be allowed.
	 */
	getEditUrl?: (savedObject: SavedObject<Attributes>) => string;
	/**
	 * Function returning the url to use to redirect to this object from the management section.
	 * If not defined, redirecting to the object will not be allowed.
	 *
	 * @returns undefined or an object containing a `path` and `uiCapabilitiesPath` properties. the `path` is the path to
	 *          the object page, relative to the base path. `uiCapabilitiesPath` is the path to check in the
	 *          {@link Capabilities | uiCapabilities} to check if the user has permission to access the object.
	 */
	getInAppUrl?: (savedObject: SavedObject<Attributes>) => {
		path: string;
		uiCapabilitiesPath: string;
	} | undefined;
	/**
	 * An optional export transform function that can be used transform the objects of the registered type during
	 * the export process.
	 *
	 * It can be used to either mutate the exported objects, or add additional objects (of any type) to the export list.
	 *
	 * See {@link SavedObjectsExportTransform | the transform type documentation} for more info and examples.
	 *
	 * When implementing both `isExportable` and `onExport`, it is mandatory that
	 * `isExportable` returns the same value for an object before and after going
	 * though the export transform.
	 * E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`
	 *
	 * @remarks `importableAndExportable` must be `true` to specify this property.
	 */
	onExport?: SavedObjectsExportTransform<Attributes>;
	/**
	 * An optional {@link SavedObjectsImportHook | import hook} to use when importing given type.
	 *
	 * Import hooks are executed during the savedObjects import process and allow to interact
	 * with the imported objects. See the {@link SavedObjectsImportHook | hook documentation}
	 * for more info.
	 *
	 * @example
	 * Registering a hook displaying a warning about a specific type of object
	 * ```ts
	 * // src/plugins/my_plugin/server/plugin.ts
	 * import { myType } from './saved_objects';
	 *
	 * export class Plugin() {
	 *   setup: (core: CoreSetup) => {
	 *     core.savedObjects.registerType({
	 *        ...myType,
	 *        management: {
	 *          ...myType.management,
	 *          onImport: (objects) => {
	 *            if(someActionIsNeeded(objects)) {
	 *              return {
	 *                 warnings: [
	 *                   {
	 *                     type: 'action_required',
	 *                     message: 'Objects need to be manually enabled after import',
	 *                     actionPath: '/app/my-app/require-activation',
	 *                   },
	 *                 ]
	 *              }
	 *            }
	 *            return {};
	 *          }
	 *        },
	 *     });
	 *   }
	 * }
	 * ```
	 *
	 * @remarks messages returned in the warnings are user facing and must be translated.
	 * @remarks `importableAndExportable` must be `true` to specify this property.
	 */
	onImport?: SavedObjectsImportHook<Attributes>;
	/**
	 * Optional hook to specify whether an object should be exportable.
	 *
	 * If specified, `isExportable` will be called during export for each
	 * of this type's objects in the export, and the ones not matching the
	 * predicate will be excluded from the export.
	 *
	 * When implementing both `isExportable` and `onExport`, it is mandatory that
	 * `isExportable` returns the same value for an object before and after going
	 * though the export transform.
	 * E.g `isExportable(objectBeforeTransform) === isExportable(objectAfterTransform)`
	 *
	 * @example
	 * Registering a type with a per-object exportability predicate
	 * ```ts
	 * // src/plugins/my_plugin/server/plugin.ts
	 * import { myType } from './saved_objects';
	 *
	 * export class Plugin() {
	 *   setup: (core: CoreSetup) => {
	 *     core.savedObjects.registerType({
	 *        ...myType,
	 *        management: {
	 *          ...myType.management,
	 *          isExportable: (object) => {
	 *            if (object.attributes.myCustomAttr === 'foo') {
	 *              return false;
	 *            }
	 *            return true;
	 *          }
	 *        },
	 *     });
	 *   }
	 * }
	 * ```
	 *
	 * @remarks `importableAndExportable` must be `true` to specify this property.
	 */
	isExportable?: SavedObjectsExportablePredicate<Attributes>;
}
interface SavedObjectsTypeMappingDefinition {
	/** The dynamic property of the mapping, either `false` or `'strict'`. If
	 * unspecified `dynamic: 'strict'` will be inherited from the top-level
	 * index mappings. */
	dynamic?: false | "false" | "strict";
	/** The underlying properties of the type mapping */
	properties: SavedObjectsMappingProperties;
}
interface SavedObjectsUpdateObjectsSpacesObject {
	/** The type of the object to update */
	id: string;
	/** The ID of the object to update */
	type: string;
	/**
	 * The space(s) that the object to update currently exists in. This is only intended to be used by SOC wrappers.
	 *
	 * @internal
	 */
	spaces?: string[];
	/**
	 * The version of the object to update; this is used for optimistic concurrency control. This is only intended to be used by SOC wrappers.
	 *
	 * @internal
	 */
	version?: string;
}
interface SavedObjectsUpdateObjectsSpacesOptions extends SavedObjectsBaseOptions {
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
}
interface SavedObjectsUpdateObjectsSpacesResponse {
	/** array of {@link SavedObjectsUpdateObjectsSpacesResponseObject}  */
	objects: SavedObjectsUpdateObjectsSpacesResponseObject[];
}
interface SavedObjectsUpdateObjectsSpacesResponseObject {
	/** The type of the referenced object */
	type: string;
	/** The ID of the referenced object */
	id: string;
	/** The space(s) that the referenced object exists in */
	spaces: string[];
	/** Included if there was an error updating this object's spaces */
	error?: SavedObjectError;
}
interface SavedObjectsUpdateOptions<Attributes = unknown> extends SavedObjectsBaseOptions {
	/**
	 * An opaque version number which changes on each successful write operation.
	 * Can be used for implementing optimistic concurrency control.
	 * Unused for multi-namespace objects
	 */
	version?: string;
	/** {@inheritdoc SavedObjectReference} */
	references?: SavedObjectReference[];
	/** The Elasticsearch Refresh setting for this operation */
	refresh?: MutatingOperationRefreshSetting;
	/** If specified, will be used to perform an upsert if the object doesn't exist */
	upsert?: Attributes;
	/**
	 * The Elasticsearch `retry_on_conflict` setting for this operation.
	 * Defaults to `0` when `version` is provided, `3` otherwise.
	 */
	retryOnConflict?: number;
	/** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
	migrationVersionCompatibility?: "compatible" | "raw";
	/**
	 * By default, update will merge the provided attributes with the ones present on the document
	 * (performing a standard partial update). Setting this option to `false` will change the behavior, performing
	 * a "full" update instead, where the provided attributes will fully replace the existing ones.
	 * Defaults to `true`.
	 */
	mergeAttributes?: boolean;
}
interface SavedObjectsUpdateResponse<T = unknown> extends Omit<SavedObject<T>, "attributes" | "references"> {
	/** partial attributes of the saved object */
	attributes: Partial<T>;
	/** optionally included references to other saved objects */
	references: SavedObjectReference[] | undefined;
}
interface SavedObjectsValidationMap {
	[version: string]: SavedObjectsValidationSpec;
}
interface SchemaStructureEntry {
	path: string[];
	type: string;
}
interface SchemaValidationOptions {
	/**
	 * Remove unknown config keys
	 */
	stripUnknownKeys?: boolean;
}
interface SecurityRequestHandlerContext {
	authc: AuthcRequestHandlerContext;
	audit: AuditRequestHandlerContext;
}
interface SecurityServiceSetup {
	/**
	 * Register the security implementation that then will be used and re-exposed by Core.
	 *
	 * @remark this should **exclusively** be used by the security plugin.
	 */
	registerSecurityDelegate(api: CoreSecurityDelegateContract): void;
	/**
	 * The {@link CoreFipsService | FIPS service}
	 */
	fips: CoreFipsService;
}
interface SecurityServiceStart {
	/**
	 * The {@link CoreAuthenticationService | authentication service}
	 */
	authc: CoreAuthenticationService;
	/**
	 * The {@link CoreAuditService | audit service}
	 */
	audit: CoreAuditService;
}
interface SerializableArray extends Array<Serializable> {
}
interface SerializableRecord extends Record<string, Serializable> {
}
interface ServiceStatus<Meta extends Record<string, any> | unknown = unknown> {
	/**
	 * The current availability level of the service.
	 */
	level: ServiceStatusLevel;
	/**
	 * A high-level summary of the service status.
	 */
	summary: string;
	/**
	 * A more detailed description of the service status.
	 */
	detail?: string;
	/**
	 * A URL to open in a new tab about how to resolve or troubleshoot the problem.
	 */
	documentationUrl?: string;
	/**
	 * Any JSON-serializable data to be included in the HTTP API response. Useful for providing more fine-grained,
	 * machine-readable information about the service status. May include status information for underlying features.
	 */
	meta?: Meta;
}
interface SessionCookieValidationResult {
	/**
	 * Whether the cookie is valid or not.
	 */
	isValid: boolean;
	/**
	 * The "Path" attribute of the cookie; if the cookie is invalid, this is used to clear it.
	 */
	path?: string;
}
interface SessionStorage<T> {
	/**
	 * Retrieves session value from the session storage.
	 */
	get(): Promise<T | null>;
	/**
	 * Puts current session value into the session storage.
	 * @param sessionValue - value to put
	 */
	set(sessionValue: T): void;
	/**
	 * Clears current session.
	 */
	clear(): void;
}
interface SessionStorageCookieOptions<T> {
	/**
	 * Name of the session cookie.
	 */
	name: string;
	/**
	 * A key used to encrypt a cookie's value. Should be at least 32 characters long.
	 */
	encryptionKey: string;
	/**
	 * Function called to validate a cookie's decrypted value.
	 */
	validate: (sessionValue: T | T[]) => SessionCookieValidationResult;
	/**
	 * Flag indicating whether the cookie should be sent only via a secure connection.
	 */
	isSecure: boolean;
	/**
	 * Defines SameSite attribute of the Set-Cookie Header.
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
	 */
	sameSite?: "Strict" | "Lax" | "None";
}
interface SessionStorageFactory<T> {
	asScoped: (request: KibanaRequest) => SessionStorage<T>;
}
interface SizeLimitTriggeringPolicyConfig {
	type: "size-limit";
	/**
	 * The minimum size the file must have to roll over.
	 */
	size: ByteSizeValue;
}
interface StateContainer<State extends BaseState, PureTransitions extends object = object, PureSelectors extends object = {}> extends BaseStateContainer<State> {
	transitions: Readonly<PureTransitionsToTransitions<PureTransitions>>;
	selectors: Readonly<PureSelectorsToSelectors<PureSelectors>>;
}
interface StatusServiceSetup {
	/**
	 * Current status for all Core services.
	 */
	core$: Observable<CoreStatus>;
	/**
	 * Overall system status for all of Kibana.
	 *
	 * @remarks
	 * The level of the overall status will reflect the most severe status of any core service or plugin.
	 *
	 * Exposed only for reporting purposes to outside systems and should not be used by plugins. Instead, plugins should
	 * only depend on the statuses of {@link StatusServiceSetup.core$ | Core} or their dependencies.
	 */
	overall$: Observable<ServiceStatus>;
	/**
	 * Allows a plugin to specify a custom status dependent on its own criteria.
	 * Completely overrides the default inherited status.
	 *
	 * @remarks
	 * The first emission from this Observable should occur within 30s, else this plugin's status will fallback to
	 * `unavailable` until the first emission.
	 *
	 * See the {@link StatusServiceSetup.derivedStatus$} API for leveraging the default status
	 * calculation that is provided by Core.
	 */
	set(status$: Observable<ServiceStatus>): void;
	/**
	 * Current status for all plugins this plugin depends on.
	 * Each key of the `Record` is a plugin id.
	 */
	dependencies$: Observable<Record<string, ServiceStatus>>;
	/**
	 * The status of this plugin as derived from its dependencies.
	 *
	 * @remarks
	 * By default, plugins inherit this derived status from their dependencies.
	 * Calling {@link StatusSetup.set} overrides this default status.
	 *
	 * This may emit multiple times for a single status change event as propagates
	 * through the dependency tree
	 */
	derivedStatus$: Observable<ServiceStatus>;
	/**
	 * Whether or not the status HTTP APIs are available to unauthenticated users when an authentication provider is
	 * present.
	 */
	isStatusPageAnonymous: () => boolean;
}
interface TimeIntervalTriggeringPolicyConfig {
	type: "time-interval";
	/**
	 * How often a rollover should occur.
	 *
	 * @remarks
	 * Due to how modulate rolling works, it is required to have an integer value for the highest time unit
	 * of the duration (you can't overflow to a higher unit).
	 * For example, `15m` and `4h` are valid values , but `90m` is not (as it is `1.5h`).
	 */
	interval: Duration;
	/**
	 * Indicates whether the interval should be adjusted to cause the next rollover to occur on the interval boundary.
	 *
	 * For example, if the interval is `4h` and the current hour is 3 am then
	 * the first rollover will occur at 4 am and then next ones will occur at 8 am, noon, 4pm, etc.
	 * The default value is true.
	 */
	modulate: boolean;
}
interface TypeMeta {
	/**
	 * A human-friendly description of this type to be used in documentation.
	 */
	description?: string;
	/**
	 * Whether this field is deprecated.
	 */
	deprecated?: boolean;
	/**
	 * Release version or date that this route will be removed
	 * @example 9.0.0
	 */
	"x-discontinued"?: string;
}
interface TypeOptions<T> {
	defaultValue?: T | Reference<T> | (() => T);
	validate?: (value: T) => string | void;
	meta?: TypeMeta;
}
interface UiSettingsParams<T = unknown> {
	/** title in the UI */
	name?: string;
	/** default value to fall back to if a user doesn't provide any */
	value?: T;
	/** handler to return the default value asynchronously. Supersedes the `value` prop */
	getValue?: (context?: GetUiSettingsContext) => Promise<T>;
	/** description provided to a user in UI */
	description?: string;
	/** used to group the configured setting in the UI */
	category?: string[];
	/** array of permitted values for this setting */
	options?: string[] | number[];
	/** text labels for 'select' type UI element */
	optionLabels?: Record<string, string>;
	/** a flag indicating whether new value applying requires page reloading */
	requiresPageReload?: boolean;
	/** a flag indicating that value cannot be changed */
	readonly?: boolean;
	/** a flag indicating the level of restriction of the readonly settings {@link ReadonlyModeType} */
	readonlyMode?: ReadonlyModeType;
	/**
	 * a flag indicating that value might contain user sensitive data.
	 * used by telemetry to mask the value of the setting when sent.
	 */
	sensitive?: boolean;
	/** defines a type of UI element {@link UiSettingsType} */
	type?: UiSettingsType;
	/** optional deprecation information. Used to generate a deprecation warning. */
	deprecation?: DeprecationSettings;
	/** A flag indicating that this setting is a technical preview. If true, the setting will display a tech preview badge after the title. */
	technicalPreview?: TechnicalPreviewSettings;
	/**
	 * index of the settings within its category (ascending order, smallest will be displayed first).
	 * Used for ordering in the UI.
	 *
	 * @remark settings without order defined will be displayed last and ordered by name
	 */
	order?: number;
	/**
	 * Value validation schema.
	 * Used to validate value on write and read.
	 *
	 * This schema is also used for validating the user input in all settings fields {@link FieldRow} across Kibana UI.
	 * Use schema options to specify limits on the value. For example:
	 * `schema.number({ min: 0, max: 100 })`
	 *
	 * More information about schema in https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-config-schema/README.md
	 */
	schema: Type<T>;
	/**
	 * Metric to track once this property changes
	 * @deprecated
	 * Temporary measure until https://github.com/elastic/kibana/issues/83084 is in place
	 */
	metric?: {
		type: UiCounterMetricType;
		name: string;
	};
	/**
	 * Scope of the setting. `Global` denotes a setting globally available across namespaces. `Namespace` denotes a setting
	 * scoped to a namespace. The default value is 'namespace'
	 */
	scope?: UiSettingsScope;
	/** A list of solutions where this setting is applicable.
	 * This field is used to determine whether the setting should be displayed in the stateful Advanced settings app.
	 * If undefined or an empty list, the setting must be displayed in all solutions.
	 * Note: this does not affect serverless settings, since spaces in serverless don't have solution views.
	 * */
	solutionViews?: UiSettingsSolutions;
}
interface UiSettingsRequestHandlerContext {
	client: IUiSettingsClient;
	globalClient: IUiSettingsClient;
}
interface UiSettingsServiceSetup {
	/**
	 * Sets settings with default values for the uiSettings
	 * @param settings
	 *
	 * @example
	 * ```ts
	 * setup(core: CoreSetup){
	 *  core.uiSettings.register([{
	 *   foo: {
	 *    name: i18n.translate('my foo settings'),
	 *    value: true,
	 *    description: 'add some awesomeness',
	 *   },
	 *  }]);
	 * }
	 * ```
	 */
	register(settings: Record<string, UiSettingsParams>): void;
	/**
	 * Sets settings with default values for the global uiSettings
	 * @param settings
	 *
	 * @example
	 * ```ts
	 * setup(core: CoreSetup){
	 *  core.uiSettings.register([{
	 *   foo: {
	 *    name: i18n.translate('my foo settings'),
	 *    value: true,
	 *    description: 'add some awesomeness',
	 *   },
	 *  }]);
	 * }
	 * ```
	 */
	registerGlobal(settings: Record<string, UiSettingsParams>): void;
	/**
	 * Sets an allowlist of setting keys.
	 * @param keys
	 *
	 * @example
	 * ```ts
	 * setup(core: CoreSetup){
	 *  core.uiSettings.setAllowlist(['csv:quoteValues', 'dateFormat:dow']);
	 * }
	 * ```
	 */
	setAllowlist(keys: string[]): void;
}
interface UiSettingsServiceStart {
	/**
	 * Creates a {@link IUiSettingsClient} with provided *scoped* saved objects client.
	 *
	 * This should only be used in the specific case where the client needs to be accessed
	 * from outside the scope of a {@link RequestHandler}.
	 *
	 * @example
	 * ```ts
	 * start(core: CoreStart) {
	 *  const soClient = core.savedObjects.getScopedClient(arbitraryRequest);
	 *  const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
	 * }
	 * ```
	 */
	asScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
	/**
	 * Creates a global {@link IUiSettingsClient} with provided *scoped* saved objects client.
	 *
	 * This should only be used in the specific case where the client needs to be accessed
	 * from outside the scope of a {@link RequestHandler}.
	 *
	 * @example
	 * ```ts
	 * start(core: CoreStart) {
	 *  const soClient = core.savedObjects.getScopedClient(arbitraryRequest);
	 *  const uiSettingsClient = core.uiSettings.globalAsScopedToClient(soClient);
	 * }
	 * ```
	 */
	globalAsScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
}
interface UnauthorizedErrorHandlerNotHandledResult {
	type: "notHandled";
}
interface UnauthorizedErrorHandlerOptions {
	error: UnauthorizedError;
	request: KibanaRequest;
}
interface UnauthorizedErrorHandlerResultRetryParams {
	authHeaders: AuthHeaders;
}
interface UnauthorizedErrorHandlerRetryResult extends UnauthorizedErrorHandlerResultRetryParams {
	type: "retry";
}
interface UnauthorizedErrorHandlerToolkit {
	/**
	 * The handler cannot handle the error, or was not able to authenticate.
	 */
	notHandled: () => UnauthorizedErrorHandlerNotHandledResult;
	/**
	 * The handler was able to authenticate. Will retry the failed request with new auth headers
	 */
	retry: (params: UnauthorizedErrorHandlerResultRetryParams) => UnauthorizedErrorHandlerRetryResult;
}
interface UnknownOptions {
	unknowns?: OptionsForUnknowns;
}
interface UpdateCrossClusterAPIKeyParams {
	id: string;
	type: "cross_cluster";
	expiration?: string;
	metadata?: {
		[key: string]: any;
	};
	access: {
		search?: Array<{
			names: string[];
			query?: unknown;
			field_security?: unknown;
			allow_restricted_indices?: boolean;
		}>;
		replication?: Array<{
			names: string[];
		}>;
	};
}
interface UpdateRestAPIKeyParams {
	id: string;
	type?: "rest";
	expiration?: string;
	role_descriptors: Record<string, {
		[key: string]: unknown;
	}>;
	metadata?: {
		[key: string]: any;
	};
}
interface UpdateRestAPIKeyWithKibanaPrivilegesParams {
	id: string;
	type?: "rest";
	expiration?: string;
	metadata?: {
		[key: string]: any;
	};
	kibana_role_descriptors: Record<string, {
		elasticsearch: ElasticsearchPrivilegesType & {
			[key: string]: unknown;
		};
		kibana: KibanaPrivilegesType;
	}>;
}
interface User {
	username: string;
	email?: string;
	full_name?: string;
	roles: readonly string[];
	enabled: boolean;
	metadata?: {
		_reserved: boolean;
		_deprecated?: boolean;
		_deprecated_reason?: string;
	};
}
interface UserProfile<D extends UserProfileData = UserProfileData> {
	/**
	 * Unique ID for of the user profile.
	 */
	uid: string;
	/**
	 * Indicates whether user profile is enabled or not.
	 */
	enabled: boolean;
	/**
	 * Information about the user that owns profile.
	 */
	user: UserProfileUserInfo;
	/**
	 * User specific data associated with the profile.
	 */
	data: Partial<D>;
}
interface UserProfileBulkGetParams {
	/**
	 * List of user profile identifiers.
	 */
	uids: Set<string>;
	/**
	 * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
	 * parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	dataPath?: string;
}
interface UserProfileGetCurrentParams {
	/**
	 * User request instance to get user profile for.
	 */
	request: KibanaRequest;
	/**
	 * By default, get API returns user information, but does not return any user data. The optional "dataPath"
	 * parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	dataPath?: string;
}
interface UserProfileRequestHandlerContext {
	getCurrent<D extends UserProfileData, L extends UserProfileLabels>(options?: {
		dataPath?: string;
	}): Promise<UserProfileWithSecurity<D, L> | null>;
}
interface UserProfileRequiredPrivileges {
	/**
	 * The id of the Kibana Space.
	 */
	spaceId: string;
	/**
	 * The set of the Kibana specific application privileges.
	 */
	privileges: {
		kibana: string[];
	};
}
interface UserProfileService {
	/**
	 * Retrieves a user profile for the current user extracted from the specified request. If the profile isn't available,
	 * e.g. for the anonymous users or users authenticated via authenticating proxies, the `null` value is returned.
	 * @param params Get current user profile operation parameters.
	 * @param params.request User request instance to get user profile for.
	 * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
	 * optional "dataPath" parameter can be used to return personal data for the requested user
	 * profiles (within `kibana` namespace only).
	 */
	getCurrent<D extends UserProfileData, L extends UserProfileLabels>(params: UserProfileGetCurrentParams): Promise<UserProfileWithSecurity<D, L> | null>;
	/**
	 * Retrieves multiple user profiles by their identifiers.
	 * @param params Bulk get operation parameters.
	 * @param params.uids List of user profile identifiers.
	 * @param params.dataPath By default Elasticsearch returns user information, but does not return any user data. The
	 * optional "dataPath" parameter can be used to return personal data for the requested user
	 * profiles (within `kibana` namespace only).
	 */
	bulkGet<D extends UserProfileData>(params: UserProfileBulkGetParams): Promise<Array<UserProfile<D>>>;
	/**
	 * Suggests multiple user profiles by search criteria.
	 * @param params Suggest operation parameters.
	 * @param params.name Query string used to match name-related fields in user profiles. The following fields are treated as name-related: username, full_name and email.
	 * @param params.size Desired number of suggestion to return. The default value is 10.
	 * @param params.dataPath By default, suggest API returns user information, but does not return any user data. The optional "dataPath" parameter can be used to return personal data for this user (within `kibana` namespace only).
	 * @param params.requiredPrivileges The set of the privileges that users associated with the suggested user profile should have in the specified space. If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the privileges of the associated users.
	 */
	suggest<D extends UserProfileData>(params: UserProfileSuggestParams): Promise<Array<UserProfile<D>>>;
}
interface UserProfileServiceSetup {
	/**
	 * Register the userProfile implementation that will be used and re-exposed by Core.
	 *
	 * @remark this should **exclusively** be used by the security plugin.
	 */
	registerUserProfileDelegate(delegate: CoreUserProfileDelegateContract): void;
}
interface UserProfileSuggestParams {
	/**
	 * Query string used to match name-related fields in user profiles. The following fields are treated as
	 * name-related: username, full_name and email.
	 */
	name?: string;
	/**
	 * Extra search criteria to improve relevance of the suggestion result. A profile matching the
	 * specified hint is ranked higher in the response. But not-matching the hint does not exclude a
	 * profile from the response as long as it matches the `name` field query.
	 */
	hint?: {
		/**
		 * A list of Profile UIDs to match against.
		 */
		uids: string[];
	};
	/**
	 * Desired number of suggestion to return. The default value is 10.
	 */
	size?: number;
	/**
	 * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
	 * parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	dataPath?: string;
	/**
	 * The set of the privileges that users associated with the suggested user profile should have in the specified space.
	 * If not specified, privileges check isn't performed and all matched profiles are returned irrespective to the
	 * privileges of the associated users.
	 */
	requiredPrivileges?: UserProfileRequiredPrivileges;
}
interface UserProfileUserInfo {
	/**
	 * Username of the user.
	 */
	username: string;
	/**
	 * Optional email of the user.
	 */
	email?: string;
	/**
	 * Optional full name of the user.
	 */
	full_name?: string;
}
interface UserProfileUserInfoWithSecurity extends UserProfileUserInfo {
	/**
	 * List of the user roles.
	 */
	roles: readonly string[];
	/**
	 * Name of the Elasticsearch security realm that was used to authenticate user.
	 */
	realm_name: string;
	/**
	 * Optional name of the security domain that Elasticsearch security realm that was
	 * used to authenticate user resides in (if any).
	 */
	realm_domain?: string;
}
interface UserProfileWithSecurity<D extends UserProfileData = UserProfileData, L extends UserProfileLabels = UserProfileLabels> extends UserProfile<D> {
	/**
	 * Information about the user that owns profile.
	 */
	user: UserProfileUserInfoWithSecurity;
	/**
	 * User specific _searchable_ labels associated with the profile. Note that labels are considered
	 * security related field since it's going to be used to store user's space ID.
	 */
	labels: L;
}
interface UserProvidedValues<T = any> {
	userValue?: T;
	isOverridden?: boolean;
}
interface UserRealm {
	/**
	 * Arbitrary name of the security realm.
	 */
	name: string;
	/**
	 * Type of the security realm (file, native, saml etc.).
	 */
	type: string;
}
interface UserSettingsServiceSetup {
}
interface ValidateAPIKeyParams {
	/**
	 * Unique id for this API key
	 */
	id: string;
	/**
	 * Generated API Key (secret)
	 */
	api_key: string;
}
interface ValueValidation {
	valid: boolean;
	errorMessage?: string;
}
interface VersionBumpDeprecationType {
	/**
	 * bump deprecation reason denotes a new version of the API is available
	 */
	type: "bump";
	/**
	 * new version of the API to be used instead.
	 */
	newApiVersion: string;
}
interface VersionedRoute<Method extends RouteMethod = RouteMethod, Ctx extends RqCtx = RqCtx> {
	/**
	 * Add a new version of this route
	 * @param opts {@link AddVersionOpts | Options} for this version of a route
	 * @param handler The request handler for this version of a route
	 * @returns A versioned route, allows for fluent chaining of version declarations
	 * @public
	 */
	addVersion<P = unknown, Q = unknown, B = unknown>(options: AddVersionOpts<P, Q, B>, handler: (...params: Parameters<RequestHandler<P, Q, B, Ctx>>) => MaybePromise<IKibanaResponse>): VersionedRoute<Method, Ctx>;
}
interface VersionedRouteCustomResponseBodyValidation {
	/** A custom validation function */
	custom: RouteValidationFunction<unknown>;
}
interface VersionedRouteResponseValidation {
	[statusCode: number]: {
		/**
		 * A description of the response. This is required input for complete OAS documentation.
		 */
		description?: string;
		/**
		 * A string representing the mime type of the response body.
		 */
		bodyContentType?: string;
		body?: VersionedResponseBodyValidation;
	};
	unsafe?: {
		body?: boolean;
	};
}
interface VersionedRouteValidation<P, Q, B> {
	/**
	 * Validation to run against route inputs: params, query and body
	 * @public
	 */
	request?: VersionedRouteRequestValidation<P, Q, B>;
	/**
	 * Validation to run against route output.
	 *
	 * @note This validation is only intended to run in development. Do not use this
	 *       for setting default values!
	 *
	 * @public
	 */
	response?: VersionedRouteResponseValidation;
}
interface VersionedRouter<Ctx extends RqCtx = RqCtx> {
	/**
	 * @public
	 * @track-adoption
	 */
	get: VersionedRouteRegistrar<"get", Ctx>;
	/**
	 * @public
	 * @track-adoption
	 */
	put: VersionedRouteRegistrar<"put", Ctx>;
	/**
	 * @public
	 * @track-adoption
	 */
	post: VersionedRouteRegistrar<"post", Ctx>;
	/**
	 * @public
	 * @track-adoption
	 */
	patch: VersionedRouteRegistrar<"patch", Ctx>;
	/**
	 * @public
	 * @track-adoption
	 */
	delete: VersionedRouteRegistrar<"delete", Ctx>;
	/**
	 * @public
	 */
	getRoutes: () => VersionedRouterRoute[];
}
interface VersionedRouterRoute<P = unknown, Q = unknown, B = unknown> {
	method: string;
	path: string;
	options: Omit<VersionedRouteConfig<RouteMethod>, "path">;
	handlers: Array<{
		fn: Function;
		options: AddVersionOpts<P, Q, B>;
	}>;
	isVersioned: true;
}
interface VersionedState<S extends Serializable = Serializable> {
	version: string;
	state: S;
}
interface ZodEsque<V> {
	_output: V;
}
type AccessControlImportTransformsFactory = (typeRegistry: ISavedObjectTypeRegistry, errors: SavedObjectsImportFailure[]) => AccessControlImportTransforms;
type AllMappingPropertyType = Required<api.MappingProperty>["type"];
type AllRequiredCondition = Array<Privilege | {
	anyOf: Privilege[];
}>;
type AnalyticsServiceSetup = Omit<AnalyticsClient, "flush" | "shutdown">;
type AnalyticsServiceStart = Pick<AnalyticsClient, "optIn" | "reportEvent" | "telemetryCounter$">;
type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<string, any, Record<string, any>, any>;
type AnyExpressionRenderDefinition = ExpressionRenderDefinition<any>;
type AnyExpressionTypeDefinition = ExpressionTypeDefinition<string, any, any>;
type AnyMapping = Strict<api.MappingProperty>;
type AnyMappingDefinition = MappingsDefinition<MappingProperty>;
type AnyRequiredCondition = Array<Privilege | {
	allOf: Privilege[];
}>;
type ApiVersion = string;
type AppenderConfigType = ConsoleAppenderConfig | FileAppenderConfig | RewriteAppenderConfig | RollingFileAppenderConfig;
type ArgumentType<T> = SingleArgumentType<T> | MultipleArgumentType<T> | UnresolvedSingleArgumentType<T> | UnresolvedMultipleArgumentType<T>;
type ArrayTypeToArgumentString<T> = T extends Array<infer ElementType> ? TypeString<ElementType> : T extends null ? "null" : never;
type Ast = {
	type: "expression";
	chain: AstFunction[];
};
type AstArgument = string | boolean | number | Ast;
type AstFunction = {
	type: "function";
	function: string;
	arguments: Record<string, AstArgument[]>;
};
type AuditServiceContract = CoreAuditService;
type AuthHeaders = Record<string, string | string[]>;
type AuthResult = AuthResultAuthenticated | AuthResultNotHandled | AuthResultRedirected;
type AuthenticationHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: AuthToolkit) => AuthResult | IKibanaResponse | Promise<AuthResult | IKibanaResponse>;
type AuthenticationServiceContract = CoreAuthenticationService;
type AuthorizationTypeMap<A extends string> = Map<string, Record<A, AuthorizationTypeEntry>>;
type AuthorizeOpenPointInTimeParams = AuthorizeFindParams;
type AwaitedProperties<T> = {
	[K in keyof T]: Awaited<T[K]>;
};
type BaseState = object;
type BuildFlavor = "serverless" | "traditional";
type ByteSizeValueUnit = "b" | "kb" | "mb" | "gb";
type Capabilities = {
	/** Navigation link capabilities. */
	navLinks: Record<string, boolean>;
	/** Management section capabilities. */
	management: {
		[sectionId: string]: Record<string, boolean>;
	};
	/** Catalogue capabilities. Catalogue entries drive the visibility of the Kibana homepage options. */
	catalogue: Record<string, boolean>;
	/** Custom capabilities, registered by plugins. */
	[key: string]: Record<string, boolean | Record<string, boolean>>;
} & {
	discover?: {};
	dashboard?: {};
	maps?: {};
	visualize?: {};
};
type CapabilitiesProvider = () => Partial<Capabilities>;
type CapabilitiesSwitcher = (request: KibanaRequest, uiCapabilities: Capabilities, useDefaultCapabilities: boolean) => MaybePromise<Partial<Capabilities>>;
type ClientBulk<TDocumentType> = (request: ClientBulkRequest<TDocumentType>) => Promise<ClientBulkResponse>;
type ClientBulkRequest<TDocument> = Omit<OmitIndexProp<api.BulkRequest<TDocument>>, "operations"> & {
	operations: (ClientBulkOperation | api.BulkUpdateAction<TDocument, Partial<TDocument>> | TDocument)[];
};
type ClientBulkResponse = api.BulkResponse;
type ClientExistsIndex = () => Promise<boolean>;
type ClientGet<TDocumentType> = (request: ClientGetRequest) => Promise<ClientGetResponse<TDocumentType>>;
type ClientGetRequest = OmitIndexProp<api.GetRequest & api.SearchRequest>;
type ClientGetResponse<TDocument> = api.GetResponse<TDocument>;
type ClientIndex<FullDocumentType> = (request: ClientIndexRequest<FullDocumentType>) => Promise<ClientIndexResponse>;
type ClientIndexRequest<TDocument> = OmitIndexProp<api.IndexRequest<TDocument>>;
type ClientIndexResponse = api.IndexResponse;
type ConditionalTypeValue = string | number | boolean | object | null;
type ConfigUsageData = Record<string, any | any[]>;
type CoreIncrementUsageCounter = (params: CoreIncrementCounterParams) => void;
type CoreStatus = CoreStatusBase | CoreStatusWithHttp;
type CoreUserProfileDelegateContract = UserProfileService & {
	/**
	 * Updates user preferences by identifier.
	 * @param uid User ID
	 * @param data Application data to be written (merged with existing data).
	 */
	update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
};
type CreateAPIKeyParams = CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams | CreateCrossClusterAPIKeyParams;
type CreateAPIKeyResult = estypes.SecurityCreateApiKeyResponse;
type CustomBrandingFetchFn = (request: KibanaRequest, unauthenticated: boolean) => MaybePromise<CustomBranding>;
type DatatableColumnType = "_source" | "attachment" | "boolean" | "date" | "geo_point" | "geo_shape" | "ip" | "murmur3" | "number" | "string" | "unknown" | "conflict" | "object" | "nested" | "histogram" | "null";
type DatatableRow = Record<string, any>;
type DeepPartial<T> = T extends any[] ? DeepPartialArray<T[number]> : T extends object ? DeepPartialObject<T> : T;
type DeepPartialObject<T> = {
	[P in keyof T]+?: DeepPartial<T[P]>;
};
type DefinedProperties<Base extends NullableProps> = Pick<Base, {
	[Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
}[keyof Base]>;
type DeprecatedApiUsageFetcher = (params: {
	soClient: ISavedObjectsRepository;
}) => Promise<CoreDeprecatedApiUsageStats[]>;
type DeprecationsDetails = ConfigDeprecationDetails | ApiDeprecationDetails | FeatureDeprecationDetails;
type DestructiveRouteMethod = "post" | "put" | "delete" | "patch";
type DocLinksServiceStart = DocLinksServiceSetup;
type DomainDeprecationDetails<ExtendedDetails = DeprecationsDetails> = ExtendedDetails & {
	domainId: string;
};
type DurationValueType = Duration | string | number;
type EcsHttp$1 = Required<LogMeta>["http"];
type EcsRequest = Required<EcsHttp$1>["request"];
type Either<L = unknown, R = L> = Left<L> | Right<R>;
type ElasticsearchClient = Omit<Client, "connectionPool" | "serializer" | "extend" | "close" | "diagnostic">;
type ElasticsearchConfigType = TypeOf<typeof configSchema>;
type Ensure<T, X> = T extends X ? T : never;
type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;
type EnsureSubsetOf<SubsetDefinition extends AnyMappingDefinition, AllFields extends GetFieldsOf<SubsetDefinition>> = Exact<GetFieldsOf<SubsetDefinition>, PartialWithArrayValues<AllFields>> extends true ? true : MissingKeysError<Exclude<UnionKeys<GetFieldsOf<SubsetDefinition>> extends string ? UnionKeys<GetFieldsOf<SubsetDefinition>> : never, UnionKeys<AllFields>>>;
type ErrorLike = SerializedError & {
	original?: SerializedError;
};
type EvaluationContext = MultiContextEvaluationContext | SingleContextEvaluationContext;
type Exact<T, U> = T extends U ? Exclude<UnionKeys<T>, UnionKeys<U>> extends never ? true : false : false;
type ExecutionContainer<Output = ExpressionValue> = StateContainer<ExecutionState<Output>, ExecutionPureTransitions<Output>>;
type ExecutionContextStart = ExecutionContextSetup;
type ExecutorContainer<Context extends Record<string, unknown> = Record<string, unknown>> = StateContainer<ExecutorState<Context>, ExecutorPureTransitions, ExecutorPureSelectors>;
type ExpressionAstArgument = string | boolean | number | ExpressionAstExpression;
type ExpressionAstExpression = Omit<Ast, "chain"> & {
	chain: ExpressionAstFunction[];
};
type ExpressionAstFunction = Omit<AstFunction, "arguments"> & {
	arguments: Record<string, ExpressionAstArgument[]>;
	/**
	 * Debug information added to each function when expression is executed in *debug mode*.
	 */
	debug?: ExpressionAstFunctionDebug;
};
type ExpressionAstFunctionDebug = {
	/**
	 * True if function successfully returned output, false if function threw.
	 */
	success: boolean;
	/**
	 * Id of expression function.
	 */
	fn: string;
	/**
	 * Input that expression function received as its first argument.
	 */
	input: ExpressionValue;
	/**
	 * Map of resolved arguments expression function received as its second argument.
	 */
	args: Record<string, ExpressionValue>;
	/**
	 * Result returned by the expression function. Including an error result
	 * if it was returned by the function (not thrown).
	 */
	output?: ExpressionValue;
	/**
	 * Error that function threw normalized to `ExpressionValueError`.
	 */
	error?: ExpressionValueError;
	/**
	 * Raw error that was thrown by the function, if any.
	 */
	rawError?: any | Error;
	/**
	 * Time in milliseconds it took to execute the function. Duration can be
	 * `undefined` if error happened during argument resolution, because function
	 * timing starts after the arguments have been resolved.
	 */
	duration: number | undefined;
};
type ExpressionAstNode = ExpressionAstExpression | ExpressionAstFunction | ExpressionAstArgument;
type ExpressionValue = ExpressionValueUnboxed | ExpressionValueBoxed;
type ExpressionValueBoxed<Type extends string = string, Value extends object = object> = {
	type: Type;
} & Value;
type ExpressionValueConverter<I extends ExpressionValue, O extends ExpressionValue> = (input: I, availableTypes: Record<string, ExpressionType>) => O;
type ExpressionValueError = ExpressionValueBoxed<"error", {
	error: ErrorLike;
	info?: SerializableRecord;
}>;
type ExpressionValueUnboxed = any;
type ExtendedObjectType<P extends Props, NP extends NullableProps> = ObjectType<ExtendedProps<P, NP>>;
type ExtendedObjectTypeOptions<P extends Props, NP extends NullableProps> = ObjectTypeOptions<ExtendedProps<P, NP>>;
type ExtendedProps<P extends Props, NP extends NullableProps> = Omit<P, keyof NP> & {
	[K in keyof DefinedProperties<NP>]: NP[K];
};
type FeatureFlagsRequestHandlerContext = Pick<FeatureFlagsStart, "getBooleanValue" | "getStringValue" | "getNumberValue">;
type FieldFormatParams<P = {}> = SerializableRecord & P;
type Filter = {
	$state?: {
		store: FilterStateStore;
	};
	meta: FilterMeta;
	query?: Record<string, any>;
};
type FilterMeta = {
	alias?: string | null;
	disabled?: boolean;
	negate?: boolean;
	controlledBy?: string;
	group?: string;
	index?: string;
	isMultiIndex?: boolean;
	type?: string;
	key?: string;
	params?: FilterMetaParams;
	value?: string;
};
type FilterMetaParams = Filter | Filter[] | RangeFilterMeta | RangeFilterParams | PhraseFilterMeta | PhraseFilterMetaParams | PhrasesFilterMeta | MatchAllFilterMeta | string | string[] | boolean | boolean[] | number | number[];
type GetAuthState = <T = unknown>(request: KibanaRequest) => {
	status: AuthStatus;
	state: T;
};
type GetFieldsOf<Definition extends MappingsDefinition<MappingProperty>> = PartialWithArrayValues<ToPrimitives<{
	type: "object";
	properties: Definition["properties"];
}>>;
type GetMigrationFunctionObjectFn = () => MigrateFunctionsObject;
type HandlerFunction<T extends object> = (context: T, ...args: any[]) => any;
type HandlerParameters<T extends HandlerFunction<any>> = T extends (context: any, ...args: infer U) => any ? U : never;
type Headers$1 = {
	[header in KnownHeaders]?: string | string[] | undefined;
} & {
	[header: string]: string | string[] | undefined;
};
type HttpProtocol = "http1" | "http2";
type HttpResourcesRequestHandler<P = unknown, Q = unknown, B = unknown, Context extends RequestHandlerContext = RequestHandlerContext> = RequestHandler<P, Q, B, Context, "get", KibanaResponseFactory & HttpResourcesServiceToolkit>;
type HttpResourcesResponseOptions = HttpResponseOptions;
type HttpResponsePayload = undefined | string | Record<string, any> | Buffer | Stream;
type IContextProvider<Context extends RequestHandlerContextBase, ContextName extends keyof Context> = (context: Omit<Context, ContextName>, ...rest: HandlerParameters<RequestHandler>) => MaybePromise<Awaited<Context[ContextName]>>;
type IPricingProduct = TypeOf<typeof pricingProductsSchema>;
type InitialFeatureFlagsGetter = () => Promise<Record<string, unknown>>;
type InternalRouteSecurity = RouteSecurity | RouteSecurityGetter;
type IsAuthenticated = (request: KibanaRequest) => boolean;
type KibanaExecutionContext = {
	/**
	 * Kibana application initiated an operation.
	 * */
	readonly type?: string;
	/** public name of an application or a user-facing feature */
	readonly name?: string;
	/** id of the current space */
	readonly space?: string;
	/**
	 * a stand alone, logical unit such as an application page or tab
	 * @remarks This value should NOT include unique identifiers like IDs or names.
	 * @example 'reportingHome' or '/myApp/myPage/{id}/edit
	 */
	readonly page?: string;
	/** unique value to identify the source */
	readonly id?: string;
	/** human readable description. For example, a vis title, action name */
	readonly description?: string;
	/** in browser - url to navigate to a current page, on server - endpoint path, for task: task SO url */
	readonly url?: string;
	/** Metadata attached to the field. An optional parameter that allows to describe the execution context in more detail. **/
	readonly meta?: {
		[key: string]: string | number | boolean | undefined;
	};
	/** an inner context spawned from the current context. */
	child?: KibanaExecutionContext;
};
type KibanaPrivilegesType = Array<{
	spaces: string[];
	base?: string[];
	feature?: Record<string, string[]>;
}>;
type KibanaProject = (typeof KIBANA_PROJECTS)[number];
type KibanaRequestRouteOptions<Method extends RouteMethod> = (Method extends "get" | "options" ? Required<Omit<RouteConfigOptions<Method>, "body">> : Required<RouteConfigOptions<Method>>) & {
	security?: RouteSecurity;
};
type KibanaResponseFactory = KibanaSuccessResponseFactory & KibanaRedirectionResponseFactory & KibanaNotModifiedResponseFactory & KibanaErrorResponseFactory & {
	/**
	 * Creates a response with defined status code and payload.
	 * @param options - {@link FileHttpResponseOptions} configures HTTP response parameters.
	 */
	file<T extends HttpResponsePayload | ResponseError>(options: FileHttpResponseOptions<T>): IKibanaResponse;
	/**
	 * Creates a response with defined status code and payload.
	 * @param options - {@link CustomHttpResponseOptions} configures HTTP response parameters.
	 */
	custom<T extends HttpResponsePayload | ResponseError>(options: CustomHttpResponseOptions<T>): IKibanaResponse;
};
type KnownHeaders = KnownKeys<IncomingHttpHeaders>;
type KnownKeys<T> = StringKeysAsVals<T> extends {
	[_ in keyof T]: infer U;
} ? U : never;
type KnownTypeToString<T> = T extends string ? "string" : T extends boolean ? "boolean" : T extends number ? "number" : T extends null ? "null" : T extends {
	type: string;
} ? T["type"] : never;
type KueryNode = any;
type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;
type LazyValidator = () => Type<unknown> | ZodEsque<unknown>;
type LifecycleResponseFactory = KibanaRedirectionResponseFactory & KibanaErrorResponseFactory;
type LogLevelId = "all" | "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "off";
type LogMessageSource = string | (() => string);
type LogMeta = Omit<EcsBase, "@timestamp" | "message"> & EcsTracing & {
	agent?: EcsAgent;
	as?: EcsAutonomousSystem;
	client?: EcsClient;
	cloud?: EcsCloud;
	container?: EcsContainer;
	destination?: EcsDestination;
	dns?: EcsDns;
	error?: EcsError;
	event?: EcsEvent;
	file?: EcsFile;
	group?: EcsGroup;
	host?: EcsHost;
	http?: EcsHttp;
	log?: Omit<EcsLog, "level" | "logger">;
	network?: EcsNetwork;
	observer?: EcsObserver;
	organization?: EcsOrganization;
	package?: EcsPackage;
	process?: EcsProcess;
	registry?: EcsRegistry;
	related?: EcsRelated;
	rule?: EcsRule;
	server?: EcsServer;
	service?: EcsService;
	source?: EcsSource;
	threat?: EcsThreat;
	tls?: EcsTls;
	url?: EcsUrl;
	user?: EcsUser;
	user_agent?: EcsUserAgent;
	vulnerability?: EcsVulnerability;
};
type MappingProperty = Extract<api.MappingProperty, {
	type: Exclude<SupportedMappingPropertyType, "object">;
}> | MappingPropertyObjectType;
type MappingPropertyObjectType = Required<ObjectMapping, "type">;
type MappingsDefinition<S extends MappingProperty = MappingProperty> = Omit<api.MappingPropertyBase, "properties"> & {
	properties: Record<string, S>;
};
type MaybePromise<T> = T | Promise<T>;
type MetricsServiceStart = MetricsServiceSetup;
type MigrateFunction<FromVersion extends Serializable = SerializableRecord, ToVersion extends Serializable = SerializableRecord> = (state: FromVersion) => ToVersion;
type MigrateFunctionsObject = {
	[semver: string]: MigrateFunction<any, any>;
};
type MissingKeysError<T extends string> = Error & `The following keys are missing from the document fields: ${T}`;
type ModelVersionIdentifier = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32" | "33" | "34" | "35" | "36" | "37" | "38" | "39" | "40";
type MultiContextEvaluationContext = OpenFeatureEvaluationContext & {
	/**
	 * Static `multi` string
	 */
	kind: "multi";
	/**
	 * The Elastic Cloud organization-specific context.
	 */
	organization?: OpenFeatureEvaluationContext;
	/**
	 * The deployment/project-specific context.
	 */
	kibana?: OpenFeatureEvaluationContext;
};
type MultipleArgumentType<T> = BaseArgumentType<T> & {
	multi: true;
	resolve?: true;
	types?: Array<ArrayTypeToArgumentString<T> | UnmappedTypeStrings>;
};
type MutatingOperationRefreshSetting = boolean | "wait_for";
type NullableProps = Record<string, Type<any> | undefined | null>;
type ObjectMapping<T = Record<string, AnyMapping>> = Omit<Strict<api.MappingObjectProperty>, "properties"> & {
	type: "object";
	properties: T extends Record<string, AnyMapping> ? T : never;
};
type ObjectResultType<P extends Props> = Readonly<{
	[K in keyof OptionalProperties<P>]?: TypeOf<P[K]>;
} & {
	[K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
}>;
type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> & UnknownOptions & {
	meta?: TypeOptions<ObjectResultType<P>>["meta"] & ObjectTypeOptionsMeta;
};
type OmitIndexProp<T> = Omit<T, "index">;
type OnPostAuthHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPostAuthToolkit) => OnPostAuthResult | IKibanaResponse | Promise<OnPostAuthResult | IKibanaResponse>;
type OnPostAuthResult = OnPostAuthNextResult | OnPostAuthAuthzResult;
type OnPreAuthHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPreAuthToolkit) => OnPreAuthResult | IKibanaResponse | Promise<OnPreAuthResult | IKibanaResponse>;
type OnPreAuthResult = OnPreAuthNextResult;
type OnPreResponseHandler = (request: KibanaRequest, preResponse: OnPreResponseInfo, toolkit: OnPreResponseToolkit) => OnPreResponseResult | Promise<OnPreResponseResult>;
type OnPreResponseResult = OnPreResponseResultRender | OnPreResponseResultNext;
type OnPreRoutingHandler = (request: KibanaRequest, response: LifecycleResponseFactory, toolkit: OnPreRoutingToolkit) => OnPreRoutingResult | IKibanaResponse | Promise<OnPreRoutingResult | IKibanaResponse>;
type OnPreRoutingResult = OnPreRoutingResultNext | OnPreRoutingResultRewriteUrl;
type OptionalProperties<Base extends Props> = Pick<Base, {
	[Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
}[keyof Base]>;
type OptionsForUnknowns = "allow" | "ignore" | "forbid";
type PartialWithArrayValues<T> = Partial<{
	[P in keyof T]?: T[P] extends {} ? PartialWithArrayValues<T[P]> | PartialWithArrayValues<T[P]>[] : T[P] | T[P][];
}>;
type PathConfigType = TypeOf<typeof config.schema>;
type PersistableStateDefinition<P extends SerializableRecord = SerializableRecord> = Partial<PersistableState<P>>;
type PhraseFilterMeta = FilterMeta & {
	params?: PhraseFilterMetaParams;
	field?: string;
	index?: string;
};
type PhraseFilterValue = string | number | boolean;
type PhrasesFilterMeta = FilterMeta & {
	params: PhraseFilterValue[];
	field?: string;
};
type PluginContractMap = Record<PluginName, unknown>;
type PluginContractResolver = <T extends PluginContractMap>(...pluginNames: Array<keyof T>) => Promise<PluginContractResolverResponse<T>>;
type PluginContractResolverResponse<ContractMap extends PluginContractMap> = {
	[Key in keyof ContractMap]: PluginContractResolverResponseItem<ContractMap[Key]>;
};
type PluginContractResolverResponseItem<ContractType = unknown> = NotFoundPluginContractResolverResponseItem | FoundPluginContractResolverResponseItem<ContractType>;
type PluginName = string;
type PluginOpaqueId = symbol;
type PricingProduct = PricingProductSecurity | PricingProductObservability;
type Privilege = string;
type Privileges = Array<Privilege | PrivilegeSet>;
type ProjectRouting = string | undefined;
type Props = Record<string, Type<any>>;
type PureSelector<State extends BaseState, Result, Args extends any[] = [
]> = (state: State) => Selector<Result, Args>;
type PureSelectorToSelector<T extends PureSelector<any, any, any>> = ReturnType<EnsurePureSelector<T>>;
type PureSelectorsToSelectors<T extends object> = {
	[K in keyof T]: PureSelectorToSelector<EnsurePureSelector<T[K]>>;
};
type PureTransition<State extends BaseState, Args extends any[]> = (state: State) => Transition<State, Args>;
type PureTransitionToTransition<T extends PureTransition<any, any>> = ReturnType<T>;
type PureTransitionsToTransitions<T extends object> = {
	[K in keyof T]: PureTransitionToTransition<EnsurePureTransition<T[K]>>;
};
type Query = {
	query: string | {
		[key: string]: any;
	};
	language: string;
};
type RangeFilterMeta = FilterMeta & {
	params?: RangeFilterParams;
	field?: string;
	formattedValue?: string;
	type: "range";
};
type ReadonlyModeType = "strict" | "ui";
type RecursiveReadonly<T> = T extends (...args: any) => any ? T : T extends any[] ? RecursiveReadonlyArray<T[number]> : T extends object ? Readonly<{
	[K in keyof T]: RecursiveReadonly<T[K]>;
}> : T;
type RedirectResponseOptions = HttpResponseOptions & {
	headers?: ResponseHeaders;
};
type RenderMode = "edit" | "preview" | "view";
type RequestHandler<P = unknown, Q = unknown, B = unknown, Context extends RequestHandlerContextBase = RequestHandlerContextBase, Method extends RouteMethod = any, ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory> = (context: Context, request: KibanaRequest<P, Q, B, Method>, response: ResponseFactory) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
type RequestHandlerContextFactory = (request: KibanaRequest) => Promise<CoreRequestHandlerContext>;
type RequestHandlerWrapper = <P, Q, B, Context extends RequestHandlerContextBase = RequestHandlerContextBase, Method extends RouteMethod = any, ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory>(handler: RequestHandler<P, Q, B, Context, Method, ResponseFactory>) => RequestHandler<P, Q, B, Context, Method, ResponseFactory>;
type RequiredProperties<Base extends Props> = Pick<Base, {
	[Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
}[keyof Base]>;
type ResponseError = string | Buffer | Stream | Error | {
	message: string | Error;
	attributes?: ResponseErrorAttributes;
};
type ResponseErrorAttributes = Record<string, any>;
type ResponseHeaders = Record<KnownHeaders, string | string[]> | Record<string, string | string[]>;
type RewritePolicyConfig = MetaRewritePolicyConfig;
type RollingStrategyConfig = NumericRollingStrategyConfig;
type RouteAccess = "public" | "internal";
type RouteAuthc = AuthcEnabled | AuthcDisabled;
type RouteAuthz = AuthzEnabled | AuthzDisabled;
type RouteContentType = "application/json" | "application/*+json" | "application/octet-stream" | "application/x-www-form-urlencoded" | "multipart/form-data" | "text/*";
type RouteMethod = SafeRouteMethod | DestructiveRouteMethod;
type RouteRegistrar<Method extends RouteMethod, Context extends RequestHandlerContextBase = RequestHandlerContextBase> = <P, Q, B>(route: RouteConfig<P, Q, B, Method>, handler: RequestHandler<P, Q, B, Context, Method>) => void;
type RouteSecurityGetter = (request?: {
	headers: KibanaRequest["headers"];
	query?: KibanaRequest["query"];
}) => RouteSecurity | undefined;
type RouteValidationFunction<T> = (data: any, validationResult: RouteValidationResultFactory) => {
	value: T;
	error?: never;
} | {
	value?: never;
	error: RouteValidationError;
};
type RouteValidationSpec<T> = ObjectType | Type<T> | ZodEsque<T> | RouteValidationFunction<T>;
type RouteValidator<P, Q, B> = RouteValidatorFullConfigRequest<P, Q, B> | (RouteValidatorRequestAndResponses<P, Q, B> & NotRouteValidatorFullConfigRequest);
type RouteValidatorFullConfigRequest<P, Q, B> = RouteValidatorConfig<P, Q, B> & RouteValidatorOptions;
type RqCtx = RequestHandlerContextBase;
type SafeRouteMethod = "get" | "options";
type SavedObject$1<T = unknown> = SavedObject<T>;
type SavedObjectMigration<InputAttributes = unknown, MigratedAttributes = unknown> = SavedObjectMigrationFn<InputAttributes, MigratedAttributes> | SavedObjectMigrationParams<InputAttributes, MigratedAttributes>;
type SavedObjectMigrationFn<InputAttributes = unknown, MigratedAttributes = unknown> = (doc: SavedObjectUnsanitizedDoc<InputAttributes>, context: SavedObjectMigrationContext) => SavedObjectUnsanitizedDoc<MigratedAttributes>;
type SavedObjectModelDataBackfillFn<InputAttributes = unknown, OutputAttributes = unknown> = (document: SavedObjectModelTransformationDoc<InputAttributes>, context: SavedObjectModelTransformationContext) => SavedObjectModelDataBackfillResult<OutputAttributes>;
type SavedObjectModelTransformationDoc<T = unknown> = SavedObjectUnsanitizedDoc<T>;
type SavedObjectModelTransformationFn<InputAttributes = unknown, OutputAttributes = unknown> = (document: SavedObjectModelTransformationDoc<InputAttributes>, context: SavedObjectModelTransformationContext) => SavedObjectModelTransformationResult<OutputAttributes>;
type SavedObjectModelUnsafeTransformFn<InputAttributes = unknown, OutputAttributes = unknown> = SavedObjectModelTransformationFn<InputAttributes, OutputAttributes>;
type SavedObjectModelVersionForwardCompatibilityFn<InAttrs = unknown, OutAttrs = unknown> = (attributes: InAttrs) => OutAttrs;
type SavedObjectModelVersionForwardCompatibilityObjectSchema = ObjectType;
type SavedObjectModelVersionForwardCompatibilitySchema<InAttrs = unknown, OutAttrs = unknown> = SavedObjectModelVersionForwardCompatibilityObjectSchema | SavedObjectModelVersionForwardCompatibilityFn<InAttrs, OutAttrs>;
type SavedObjectReference$1 = SavedObjectReference;
type SavedObjectSanitizedDoc<T = unknown> = SavedObjectDoc<T> & {
	references: SavedObjectReference[];
};
type SavedObjectTypeExcludeFromUpgradeFilterHook = (toolkit: {
	readonlyEsClient: Pick<ElasticsearchClient, "search">;
}) => MaybePromise<QueryDslQueryContainer>;
type SavedObjectUnsanitizedDoc<T = unknown> = SavedObjectDoc<T> & {
	references?: SavedObjectReference[];
};
type SavedObjectsClientFactory = ({ request, includedHiddenTypes, extensions, }: {
	request: KibanaRequest;
	includedHiddenTypes?: string[];
	extensions?: SavedObjectsExtensions;
}) => SavedObjectsClientContract;
type SavedObjectsClientFactoryProvider = (repositoryFactory: SavedObjectsRepositoryFactory) => SavedObjectsClientFactory;
type SavedObjectsClosePointInTimeOptions = SavedObjectsBaseOptions;
type SavedObjectsCollectMultiNamespaceReferencesPurpose = "collectMultiNamespaceReferences" | "updateObjectsSpaces";
type SavedObjectsConfigType = TypeOf<typeof soSchema>;
type SavedObjectsCreatePointInTimeFinderOptions = Omit<SavedObjectsFindOptions, "page" | "pit" | "searchAfter">;
type SavedObjectsEncryptionExtensionFactory = SavedObjectsExtensionFactory<ISavedObjectsEncryptionExtension | undefined>;
type SavedObjectsExportTransform<T = unknown> = (context: SavedObjectsExportTransformContext, objects: Array<SavedObject<T>>) => SavedObject[] | Promise<SavedObject[]>;
type SavedObjectsExportablePredicate<Attributes = unknown> = (obj: SavedObject<Attributes>) => boolean;
type SavedObjectsExtensionFactory<T> = (params: {
	typeRegistry: ISavedObjectTypeRegistry;
	request: KibanaRequest;
}) => T;
type SavedObjectsFieldMapping = EsMappingProperty & EsMappingPropertyBase & {
	/**
	 * The dynamic property of the mapping, either `false` or `'strict'`. If
	 * unspecified `dynamic: 'strict'` will be inherited from the top-level
	 * index mappings.
	 *
	 * Note: To limit the number of mapping fields Saved Object types should
	 * *never* use `dynamic: true`.
	 */
	dynamic?: false | "false" | "strict";
	/**
	 * Some mapping types do not accept the `properties` attributes. Explicitly adding it as optional to our type
	 * to avoid type failures on all code using accessing them via `SavedObjectsFieldMapping.properties`.
	 */
	properties?: Record<EsPropertyName, EsMappingProperty>;
};
type SavedObjectsImportHook<T = unknown> = (objects: Array<SavedObject<T>>) => SavedObjectsImportHookResult | Promise<SavedObjectsImportHookResult>;
type SavedObjectsImportWarning = SavedObjectsImportSimpleWarning | SavedObjectsImportActionRequiredWarning;
type SavedObjectsModelChange = SavedObjectsModelMappingsAdditionChange | SavedObjectsModelMappingsDeprecationChange | SavedObjectsModelDataBackfillChange | SavedObjectsModelDataRemovalChange | SavedObjectsModelUnsafeTransformChange;
type SavedObjectsModelVersionMap = {
	[mv in ModelVersionIdentifier]?: SavedObjectsModelVersion | SavedObjectsFullModelVersion;
};
type SavedObjectsModelVersionMapProvider = () => SavedObjectsModelVersionMap;
type SavedObjectsNamespaceType = "single" | "multiple" | "multiple-isolated" | "agnostic";
type SavedObjectsPointInTimeFinderClient = Pick<ISavedObjectsRepository, "find" | "openPointInTimeForType" | "closePointInTime">;
type SavedObjectsSearchResponse<Document extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, Aggregations = unknown> = estypes.SearchResponse<Document, Aggregations>;
type SavedObjectsSecurityExtensionFactory = SavedObjectsExtensionFactory<ISavedObjectsSecurityExtension | undefined>;
type SavedObjectsSpacesExtensionFactory = SavedObjectsExtensionFactory<ISavedObjectsSpacesExtension | undefined>;
type SavedObjectsValidationSpec = ObjectType;
type ScopeableRequest = KibanaRequest | FakeRequest;
type Selector<Result, Args extends any[] = [
]> = (...args: Args) => Result;
type Serializable = string | number | boolean | null | undefined | SerializableArray | SerializableRecord;
type SerializedError = {
	name: string;
	message: string;
	stack?: string;
};
type SerializedFieldFormat<P = {}, TParams extends FieldFormatParams<P> = FieldFormatParams<P>> = {
	id?: string;
	params?: TParams;
};
type ServiceStatusLevel = (typeof ServiceStatusLevels)[keyof typeof ServiceStatusLevels];
type ShallowPromise<T> = T extends Promise<infer U> ? Promise<U> : Promise<T>;
type SharedGlobalConfig = RecursiveReadonly<{
	elasticsearch: Pick<ElasticsearchConfigType, (typeof SharedGlobalConfigKeys.elasticsearch)[number]>;
	path: Pick<PathConfigType, (typeof SharedGlobalConfigKeys.path)[number]>;
	savedObjects: Pick<SavedObjectsConfigType, (typeof SharedGlobalConfigKeys.savedObjects)[number]>;
}>;
type SingleArgumentType<T> = BaseArgumentType<T> & {
	multi?: false;
	resolve?: true;
	types?: Array<KnownTypeToString<T> | UnmappedTypeStrings>;
};
type SingleContextEvaluationContext = OpenFeatureEvaluationContext & {
	/**
	 * The sub-context that it's updated. Defaults to `kibana`.
	 */
	kind?: "organization" | "kibana";
};
type SolutionId = KibanaProject;
type StartServicesAccessor<TPluginsStart extends object = object, TStart = unknown> = () => Promise<[
	CoreStart,
	TPluginsStart,
	TStart
]>;
type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;
type StrictDynamic = false | "strict";
type StringKeysAsVals<T> = {
	[K in keyof T]: string extends K ? never : number extends K ? never : K;
};
type SupportedMappingPropertyType = AllMappingPropertyType & ("text" | "integer" | "keyword" | "boolean" | "date" | "short" | "byte" | "float" | "date_nanos" | "double" | "long" | "object");
type TechnicalPreviewSettings = boolean | {
	/** Technical Preview message */
	message?: string;
	/** Key to documentation links */
	docLinksKey?: string;
};
type TimeRange = {
	from: string;
	to: string;
	mode?: "absolute" | "relative";
};
type ToPrimitives<O extends {
	properties: Record<string, MappingProperty>;
}> = {} extends O ? never : {
	[K in keyof O["properties"]]: {} extends O["properties"][K] ? never : O["properties"][K] extends {
		type: infer T;
	} ? T extends "keyword" ? O["properties"][K] extends {
		enum: infer TEnums;
	} ? TEnums extends Array<infer TEnum> ? TEnum : never : string : T extends "text" ? string : T extends "integer" ? number : T extends "long" ? number : T extends "short" ? number : T extends "float" ? number : T extends "double" ? number : T extends "byte" ? number : T extends "boolean" ? boolean : T extends "date" ? O["properties"][K] extends {
		format: "strict_date_optional_time";
	} ? string : string | number : T extends "date_nanos" ? string : T extends "object" ? O["properties"][K] extends AnyMappingDefinition ? ToPrimitives<O["properties"][K]> : never : never : never;
};
type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, "properties"> & {
	dynamic?: StrictDynamic;
};
type Transition<State extends BaseState, Args extends any[]> = (...args: Args) => State;
type TriggeringPolicyConfig = SizeLimitTriggeringPolicyConfig | TimeIntervalTriggeringPolicyConfig;
type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any> ? ReturnType<RT>["type"] : RT extends Type<any> ? RT["type"] : never;
type TypeOrLazyType = Type<any> | (() => Type<any>);
type TypeString<T> = KnownTypeToString<T extends ObservableLike<unknown> ? UnwrapObservable<T> : Awaited<T>>;
type TypeToString<T> = KnownTypeToString<T> | UnmappedTypeStrings;
type UiCounterMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT | string;
type UiSettingsScope = "namespace" | "global";
type UiSettingsSolutions = Array<SolutionId | "classic">;
type UiSettingsType = "undefined" | "json" | "markdown" | "number" | "select" | "boolean" | "string" | "array" | "image" | "color";
type UnauthorizedError = errors.ResponseError & {
	statusCode: 401;
};
type UnauthorizedErrorHandler = (options: UnauthorizedErrorHandlerOptions, toolkit: UnauthorizedErrorHandlerToolkit) => MaybePromise<UnauthorizedErrorHandlerResult>;
type UnauthorizedErrorHandlerResult = UnauthorizedErrorHandlerRetryResult | UnauthorizedErrorHandlerNotHandledResult;
type UnionKeys<T> = T extends T ? keyof T : never;
type UnmappedTypeStrings = "date" | "filter";
type UnresolvedArrayTypeToArgumentString<T> = T extends Array<(...args: any[]) => infer ElementType> ? TypeString<ElementType> : T extends (...args: any[]) => infer ElementType ? ArrayTypeToArgumentString<ElementType> : T extends null ? "null" : never;
type UnresolvedMultipleArgumentType<T> = BaseArgumentType<T> & {
	multi: true;
	resolve: false;
	types?: Array<UnresolvedArrayTypeToArgumentString<T> | UnmappedTypeStrings>;
};
type UnresolvedSingleArgumentType<T> = BaseArgumentType<T> & {
	multi?: false;
	resolve: false;
	types?: Array<UnresolvedTypeToArgumentString<T> | UnmappedTypeStrings>;
};
type UnresolvedTypeToArgumentString<T> = T extends (...args: any[]) => infer ElementType ? TypeString<ElementType> : T extends null ? "null" : never;
type UnwrapObservable<T extends ObservableLike<any>> = T extends ObservableLike<infer U> ? U : never;
type UnwrapReturnType<Function extends (...args: any[]) => unknown> = ReturnType<Function> extends ObservableLike<unknown> ? UnwrapObservable<ReturnType<Function>> : Awaited<ReturnType<Function>>;
type UpdateAPIKeyParams = UpdateRestAPIKeyParams | UpdateCrossClusterAPIKeyParams | UpdateRestAPIKeyWithKibanaPrivilegesParams;
type UpdateAPIKeyResult = estypes.SecurityUpdateApiKeyResponse;
type UserProfileData = Record<string, unknown>;
type UserProfileLabels = Record<string, string>;
type UserProfileServiceStart = UserProfileService;
type VersionedResponseBodyValidation = LazyValidator | VersionedRouteCustomResponseBodyValidation;
type VersionedRouteConfig<Method extends RouteMethod> = Omit<RouteConfig<unknown, unknown, unknown, Method>, "validate" | "options"> & {
	options?: Pick<RouteConfigOptions<Method>, "authRequired" | "xsrfRequired" | "tags" | "body" | "timeout" | "excludeFromOAS" | "excludeFromRateLimiter" | "httpResource" | "availability">;
	/** See {@link RouteConfigOptions<RouteMethod>['access']} */
	access: Exclude<RouteConfigOptions<Method>["access"], undefined>;
	/** See {@link RouteConfigOptions<RouteMethod>['security']} */
	security?: RouteSecurity;
	/**
	 * When enabled, the router will also check for the presence of an `apiVersion`
	 * query parameter to determine the route version to resolve to:
	 *
	 * `/api/my-app/foo?apiVersion=1`
	 *
	 * This enables use cases like a versioned Kibana endpoint
	 * inside an <img /> tag's href. Otherwise it should _not_ be enabled.
	 *
	 * @note When enabled and both query parameter and header are present, header
	 *       will take precedence.
	 * @note When enabled `apiVersion` is a reserved query parameter and will not
	 *       be passed to the route handler or handler validation.
	 * @note `apiVersion` is a reserved query parameter, avoid using it
	 * @public
	 * @default false
	 */
	enableQueryVersion?: boolean;
	/**
	 * Short summary of this route. Required for all routes used in OAS documentation.
	 *
	 * @example
	 * ```ts
	 * router.get({
	 *  path: '/api/foo/{id}',
	 *  access: 'public',
	 *  summary: `Get foo resources for an ID`,
	 * })
	 * ```
	 */
	summary?: string;
	/**
	 * Optional API description, which supports [CommonMark](https://spec.commonmark.org) markdown formatting
	 *
	 * @example
	 * ```ts
	 * router.get({
	 *  path: '/api/foo/{id}',
	 *  access: 'public',
	 *  summary: `Get foo resources for an ID`,
	 *  description: `Foo resources require **X** and **Y** `read` permissions to access.`,
	 * })
	 * ```
	 */
	description?: string;
	/**
	 * Release version or date that this route will be removed
	 * Use with `deprecated: {@link RouteDeprecationInfo}`
	 *
	 * @default undefined
	 */
	discontinued?: string;
};
type VersionedRouteRegistrar<Method extends RouteMethod, Ctx extends RqCtx = RqCtx> = (config: VersionedRouteConfig<Method>) => VersionedRoute<Method, Ctx>;
type VersionedRouteRequestValidation<P, Q, B> = RouteValidatorFullConfigRequest<P, Q, B>;
type WithAuditName<T> = T & {
	name?: string;
};

export {};
