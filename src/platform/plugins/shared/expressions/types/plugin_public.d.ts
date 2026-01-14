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
import { EuiBreadcrumb, EuiButtonColor, EuiButtonEmptyProps, EuiConfirmModalProps, EuiFlyoutProps, EuiFlyoutResizableProps, EuiGlobalToastListToast as EuiToast, EuiModalProps, IconType } from '@elastic/eui';
import { ConnectionRequestParams } from '@elastic/transport';
import { EvaluationContext as OpenFeatureEvaluationContext } from '@openfeature/core';
import { Provider } from '@openfeature/web-sdk';
import { EventEmitter } from 'events';
import { History as History$1, Href, LocationDescriptorObject } from 'history';
import { IncomingHttpHeaders } from 'http';
import { Container } from 'inversify';
import * as Joi from 'joi';
import { Reference as JoiReference, Schema } from 'joi';
import { Duration, isDuration } from 'moment';
import { OpenAPIV3 } from 'openapi-types';
import React$1 from 'react';
import { ReactNode } from 'react';
import { Observable } from 'rxjs';
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
declare class ExpressionLoader {
	data$: ReturnType<ExecutionContract["getData"]>;
	update$: ExpressionRenderHandler["update$"];
	render$: ExpressionRenderHandler["render$"];
	events$: ExpressionRenderHandler["events$"];
	loading$: Observable<void>;
	private execution;
	private renderHandler;
	private dataSubject;
	private loadingSubject;
	private data;
	private params;
	private subscription?;
	constructor(element: HTMLElement, expression?: string | ExpressionAstExpression, params?: IExpressionLoaderParams);
	destroy(): void;
	cancel(reason?: AbortReason): void;
	getExpression(): string | undefined;
	getAst(): ExpressionAstExpression | undefined;
	getElement(): HTMLElement;
	inspect(): Adapters | undefined;
	update(expression?: string | ExpressionAstExpression, params?: IExpressionLoaderParams): void;
	private loadData;
	private render;
	private setParams;
}
declare class ExpressionRenderHandler {
	render$: Observable<number>;
	update$: Observable<UpdateValue | null>;
	events$: Observable<ExpressionRendererEvent>;
	private element;
	private destroyFn?;
	private renderCount;
	private renderSubject;
	private eventsSubject;
	private updateSubject;
	private handlers;
	private onRenderError;
	constructor(element: HTMLElement, { onRenderError, renderMode, syncColors, syncTooltips, syncCursor, interactive, hasCompatibleActions, getCompatibleCellValueActions, executionContext, }?: ExpressionRenderHandlerParams);
	render: (value: SerializableRecord, uiState?: unknown) => Promise<void>;
	destroy: () => void;
	getElement: () => HTMLElement;
	handleRenderError: (error: ExpressionRenderError) => void;
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
declare const AGENT_BUILDER_APP_ID = "agent_builder";
declare const AI_ASSISTANT_APP_ID = "observabilityAIAssistant";
declare const APM_APP_ID = "apm";
declare const CANVAS_APP_ID = "canvas";
declare const CLOUD_CONNECT_NAV_ID = "cloud_connect";
declare const DASHBOARD_APP_ID = "dashboards";
declare const DATA_CONNECTORS_APP_ID = "data_connectors";
declare const DEV_TOOLS_APP_ID = "dev_tools";
declare const DISCOVER_APP_ID = "discover";
declare const ENTERPRISE_SEARCH_ANALYTICS_APP_ID = "enterpriseSearchAnalytics";
declare const ENTERPRISE_SEARCH_APPLICATIONS_APP_ID = "enterpriseSearchApplications";
declare const ENTERPRISE_SEARCH_APP_ID = "enterpriseSearch";
declare const ENTERPRISE_SEARCH_CONTENT_APP_ID = "enterpriseSearchContent";
declare const ES_SEARCH_PLAYGROUND_ID = "searchPlayground";
declare const ES_SEARCH_SYNONYMS_ID = "searchSynonyms";
declare const FLEET_APP_ID = "fleet";
declare const FLEET_APP_ID$1 = "fleet";
declare const GRAPH_APP_ID = "graph";
declare const HOME_APP_ID = "home";
declare const INTEGRATIONS_APP_ID = "integrations";
declare const INVENTORY_APP_ID = "inventory";
declare const KIBANA_PROJECTS: readonly [
	"oblt",
	"security",
	"es",
	"workplaceai"
];
declare const LAST_USED_LOGS_VIEWER_APP_ID = "last-used-logs-viewer";
declare const LOGS_APP_ID = "logs";
declare const MANAGEMENT_APP_ID = "management";
declare const MAPS_APP_ID = "maps";
declare const METRICS_APP_ID = "metrics";
declare const ML_APP_ID = "ml";
declare const MONITORING_APP_ID = "monitoring";
declare const OBLT_PROFILING_APP_ID = "profiling";
declare const OBLT_UX_APP_ID = "ux";
declare const OBSERVABILITY_LOGS_EXPLORER_APP_ID = "observability-logs-explorer";
declare const OBSERVABILITY_ONBOARDING_APP_ID = "observabilityOnboarding";
declare const OBSERVABILITY_OVERVIEW_APP_ID = "observability-overview";
declare const OSQUERY_APP_ID = "osquery";
declare const ReactExpressionRenderer: (props: ReactExpressionRendererProps) => React$1.JSX.Element;
declare const SEARCH_GETTING_STARTED = "searchGettingStarted";
declare const SEARCH_HOMEPAGE = "searchHomepage";
declare const SEARCH_INDEX_MANAGEMENT = "elasticsearchIndexManagement";
declare const SEARCH_INDICES = "elasticsearchIndices";
declare const SEARCH_INDICES_CREATE_INDEX = "createIndex";
declare const SEARCH_QUERY_RULES_ID = "searchQueryRules";
declare const SECURITY_APP_ID = "securitySolutionUI";
declare const SERVERLESS_ES_CONNECTORS_ID = "serverlessConnectors";
declare const SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID = "searchInferenceEndpoints";
declare const SERVERLESS_ES_WEB_CRAWLERS_ID = "serverlessWebCrawlers";
declare const SLO_APP_ID = "slo";
declare const STREAMS_APP_ID = "streams";
declare const SYNTHETICS_APP_ID = "synthetics";
declare const UPTIME_APP_ID = "uptime";
declare const VISUALIZE_APP_ID = "visualize";
declare const WORKFLOWS_APP_ID = "workflows";
declare const WORKPLACE_AI_APP_ID = "workplace_ai";
declare const name$1 = "datatable";
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
declare enum AppLeaveActionType {
	confirm = "confirm",
	default = "default"
}
declare enum AppStatus {
	/**
	 * Application is accessible.
	 */
	accessible = 0,
	/**
	 * Application is not accessible.
	 */
	inaccessible = 1
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
declare enum SecurityPageName {
	administration = "administration",
	alerts = "alerts",
	attacks = "attacks",
	aiValue = "ai_value",
	assetInventory = "asset_inventory",
	attackDiscovery = "attack_discovery",
	blocklist = "blocklist",
	alertDetections = "alert_detections",
	case = "cases",// must match `CasesDeepLinkId.cases`
	caseConfigure = "cases_configure",// must match `CasesDeepLinkId.casesConfigure`
	caseCreate = "cases_create",// must match `CasesDeepLinkId.casesCreate`
	cloudSecurityPostureBenchmarks = "cloud_security_posture-benchmarks",
	cloudSecurityPostureDashboard = "cloud_security_posture-dashboard",
	cloudSecurityPostureVulnerabilityDashboard = "cloud_security_posture-vulnerability_dashboard",
	cloudSecurityPostureFindings = "cloud_security_posture-findings",
	cloudSecurityPostureRules = "cloud_security_posture-rules",
	cloudDefend = "cloud_defend",
	cloudDefendPolicies = "cloud_defend-policies",
	dashboards = "dashboards",
	dataQuality = "data_quality",
	detections = "detections",
	detectionAndResponse = "detection_response",
	endpoints = "endpoints",
	endpointExceptions = "endpoint_exceptions",
	eventFilters = "event_filters",
	exceptions = "exceptions",
	exploreLanding = "explore",
	hostIsolationExceptions = "host_isolation_exceptions",
	hosts = "hosts",
	hostsAll = "hosts-all",
	hostsAnomalies = "hosts-anomalies",
	hostsRisk = "hosts-risk",
	hostsEvents = "hosts-events",
	hostsSessions = "hosts-sessions",
	hostsUncommonProcesses = "hosts-uncommon_processes",
	kubernetes = "kubernetes",
	landing = "get_started",
	network = "network",
	networkAnomalies = "network-anomalies",
	networkDns = "network-dns",
	networkEvents = "network-events",
	networkFlows = "network-flows",
	networkHttp = "network-http",
	networkTls = "network-tls",
	noPage = "",
	overview = "overview",
	policies = "policy",
	responseActionsHistory = "response_actions_history",
	rules = "rules",
	rulesAdd = "rules-add",
	rulesCreate = "rules-create",
	rulesLanding = "rules-landing",
	rulesManagement = "rules-management",
	scriptsLibrary = "scripts_library",
	siemReadiness = "siem_readiness",
	siemMigrationsLanding = "siem_migrations",
	siemMigrationsRules = "siem_migrations-rules",
	siemMigrationsDashboards = "siem_migrations-dashboards",
	threatIntelligence = "threat_intelligence",
	timelines = "timelines",
	timelinesTemplates = "timelines-templates",
	trustedApps = "trusted_apps",
	trustedDevices = "trusted_devices",
	users = "users",
	usersAll = "users-all",
	usersAnomalies = "users-anomalies",
	usersAuthentications = "users-authentications",
	usersEvents = "users-events",
	usersRisk = "users-risk",
	entityAnalytics = "entity_analytics",// This is the first Entity Analytics page, that is why the name is too generic.
	entityAnalyticsManagement = "entity_analytics-management",
	entityAnalyticsLanding = "entity_analytics-landing",
	entityAnalyticsPrivilegedUserMonitoring = "entity_analytics-privileged_user_monitoring",
	entityAnalyticsOverview = "entity_analytics-overview",
	entityAnalyticsThreatHunting = "entity_analytics-threat_hunting",
	entityAnalyticsEntityStoreManagement = "entity_analytics-entity_store_management",
	coverageOverview = "coverage-overview",
	notes = "notes",
	alertSummary = "alert_summary",
	configurations = "configurations",
	configurationsIntegrations = "configurations-integrations",
	configurationsAiSettings = "configurations-ai_settings",
	configurationsBasicRules = "configurations-basic_rules"
}
declare enum WorkflowsPageName {
	workflows = "workflows"
}
export declare class ExpressionsPublicPlugin implements Plugin$1<ExpressionsSetup, ExpressionsStart> {
	private static logger;
	private readonly expressions;
	constructor(initializerContext: PluginInitializerContext);
	setup(core: CoreSetup): ExpressionsSetup;
	start(core: CoreStart): ExpressionsStart;
	stop(): void;
}
/**
 * Expressions public start contrect, extends {@link ExpressionServiceStart}
 */
export interface ExpressionsStart extends ExpressionsServiceStart {
	loader: IExpressionLoader;
	render: IExpressionRenderer;
	ReactExpressionRenderer: typeof ReactExpressionRenderer;
}
/**
 * Expressions public setup contract, extends {@link ExpressionsServiceSetup}
 */
export type ExpressionsSetup = ExpressionsServiceSetup;
interface Adapters {
	requests?: RequestAdapter;
	[key: string]: any;
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
interface App<HistoryLocationState = unknown> extends AppNavOptions {
	/**
	 * The unique identifier of the application.
	 *
	 * Can only be composed of alphanumeric characters, `-`, `:` and `_`
	 */
	id: string;
	/**
	 * The title of the application.
	 */
	title: string;
	/**
	 * The category definition of the product
	 * See {@link AppCategory}
	 * See DEFAULT_APP_CATEGORIES for more reference
	 */
	category?: AppCategory;
	/**
	 * The initial status of the application.
	 * Defaulting to `accessible`
	 */
	status?: AppStatus;
	/**
	 * Optional list of locations where the app is visible.
	 *
	 * Accepts the following values:
	 * - "globalSearch": the link will appear in the global search bar
	 * - "home": the link will appear on the Kibana home page
	 * - "kibanaOverview": the link will appear in the Kibana overview page
	 * - "sideNav": the link will appear in the side navigation.
	 *   Note: "sideNav" will be deprecated when we change the navigation to "solutions" style.
	 *
	 * @default ['globalSearch', 'sideNav']
	 * unless the status is marked as `inaccessible`.
	 * @note Set to `[]` (empty array) to hide this link
	 */
	visibleIn?: AppDeepLinkLocations[];
	/**
	 * Allow to define the default path a user should be directed to when navigating to the app.
	 * When defined, this value will be used as a default for the `path` option when calling {@link ApplicationStart.navigateToApp | navigateToApp}`,
	 * and will also be appended to the {@link ChromeNavLink | application navLink} in the navigation bar.
	 */
	defaultPath?: string;
	/**
	 * An {@link AppUpdater} observable that can be used to update the application {@link AppUpdatableFields} at runtime.
	 *
	 * @example
	 *
	 * How to update an application navLink at runtime
	 *
	 * ```ts
	 * // inside your plugin's setup function
	 * export class MyPlugin implements Plugin {
	 *   private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
	 *
	 *   setup({ application }) {
	 *     application.register({
	 *       id: 'my-app',
	 *       title: 'My App',
	 *       updater$: this.appUpdater,
	 *       async mount(params) {
	 *         const { renderApp } = await import('./application');
	 *         return renderApp(params);
	 *       },
	 *     });
	 *   }
	 *
	 *   start() {
	 *      // later, when the navlink needs to be updated
	 *      appUpdater.next(() => {
	 *        visibleIn: ['globalSearch'],
	 *      })
	 *   }
	 * ```
	 */
	updater$?: Observable<AppUpdater>;
	/**
	 * Custom capabilities defined by the app.
	 */
	capabilities?: Partial<Capabilities>;
	/**
	 * Hide the UI chrome when the application is mounted. Defaults to `false`.
	 * Takes precedence over chrome service visibility settings.
	 */
	chromeless?: boolean;
	/**
	 * A mount function called when the user navigates to this app's route.
	 */
	mount: AppMount<HistoryLocationState>;
	/**
	 * Override the application's routing path from `/app/${id}`.
	 * Must be unique across registered applications. Should not include the
	 * base path from HTTP.
	 */
	appRoute?: string;
	/**
	 * If set to true, the application's route will only be checked against an exact match. Defaults to `false`.
	 *
	 * @example
	 * ```ts
	 * core.application.register({
	 *   id: 'my_app',
	 *   title: 'My App',
	 *   exactRoute: true,
	 *   mount: () => { ... },
	 * })
	 *
	 * // '[basePath]/app/my_app' will be matched
	 * // '[basePath]/app/my_app/some/path' will not be matched
	 * ```
	 */
	exactRoute?: boolean;
	/** Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL. */
	keywords?: string[];
	/**
	 * Input type for registering secondary in-app locations for an application.
	 *
	 * Deep links must include at least one of `path` or `deepLinks`. A deep link that does not have a `path`
	 * represents a topological level in the application's hierarchy, but does not have a destination URL that is
	 * user-accessible.
	 *
	 * @example
	 * ```ts
	 * core.application.register({
	 *   id: 'my_app',
	 *   title: 'Translated title',
	 *   keywords: ['translated keyword1', 'translated keyword2'],
	 *   deepLinks: [
	 *     {
	 *       id: 'sub1',
	 *       title: 'Sub1',
	 *       path: '/sub1',
	 *       keywords: ['subpath1'],
	 *     },
	 *     {
	 *       id: 'sub2',
	 *       title: 'Sub2',
	 *       deepLinks: [
	 *         {
	 *           id: 'subsub',
	 *           title: 'SubSub',
	 *           path: '/sub2/sub',
	 *           keywords: ['subpath2'],
	 *         },
	 *       ],
	 *     },
	 *   ],
	 *   mount: () => { ... }
	 * })
	 * ```
	 */
	deepLinks?: AppDeepLink[];
}
interface AppCategory {
	/**
	 * Unique identifier for the categories
	 */
	id: string;
	/**
	 * Label used for category name.
	 * Also used as aria-label if one isn't set.
	 */
	label: string;
	/**
	 * If the visual label isn't appropriate for screen readers,
	 * can override it here
	 */
	ariaLabel?: string;
	/**
	 * The order that categories will be sorted in
	 * Prefer large steps between categories to allow for further editing
	 * (Default categories are in steps of 1000)
	 */
	order?: number;
	/**
	 * Define an icon to be used for the category
	 * If the category is only 1 item, and no icon is defined, will default to the product icon
	 * Defaults to initials if no icon is defined
	 */
	euiIconType?: string;
}
interface AppLeaveActionFactory {
	/**
	 * Returns a confirm action, resulting on prompting a message to the user before leaving the
	 * application, allowing him to choose if he wants to stay on the app or confirm that he
	 * wants to leave.
	 *
	 * @param text The text to display in the confirmation message
	 * @param title (optional) title to display in the confirmation message
	 * @param callback (optional) to know that the user want to stay on the page
	 * @param confirmButtonText (optional) text for the confirmation button
	 * @param buttonColor (optional) color for the confirmation button
	 * so we can show to the user the right UX for him to saved his/her/their changes
	 */
	confirm(text: string, title?: string, callback?: () => void, confirmButtonText?: string, buttonColor?: EuiButtonColor): AppLeaveConfirmAction;
	/**
	 * Returns a default action, resulting on executing the default behavior when
	 * the user tries to leave an application
	 */
	default(): AppLeaveDefaultAction;
}
interface AppLeaveConfirmAction {
	type: AppLeaveActionType.confirm;
	text: string;
	title?: string;
	confirmButtonText?: string;
	buttonColor?: EuiButtonColor;
	callback?: () => void;
}
interface AppLeaveDefaultAction {
	type: AppLeaveActionType.default;
}
interface AppMountParameters<HistoryLocationState = unknown> {
	/**
	 * The container element to render the application into.
	 */
	element: HTMLElement;
	/**
	 * A scoped history instance for your application. Should be used to wire up
	 * your applications Router.
	 *
	 * @example
	 * How to configure react-router with a base path:
	 *
	 * ```ts
	 * // inside your plugin's setup function
	 * export class MyPlugin implements Plugin {
	 *   setup({ application }) {
	 *     application.register({
	 *      id: 'my-app',
	 *      appRoute: '/my-app',
	 *      async mount(params) {
	 *        const { renderApp } = await import('./application');
	 *        return renderApp(params);
	 *      },
	 *    });
	 *  }
	 * }
	 * ```
	 *
	 * ```ts
	 * // application.tsx
	 * import React from 'react';
	 * import ReactDOM from 'react-dom';
	 * import { Router, Route } from 'react-router-dom';
	 *
	 * import { CoreStart, AppMountParameters } from 'src/core/public';
	 * import { MyPluginDepsStart } from './plugin';
	 *
	 * export renderApp = ({ element, history }: AppMountParameters) => {
	 *   ReactDOM.render(
	 *     <Router history={history}>
	 *       <Route path="/" exact component={HomePage} />
	 *     </Router>,
	 *     element
	 *   );
	 *
	 *   return () => ReactDOM.unmountComponentAtNode(element);
	 * }
	 * ```
	 */
	history: ScopedHistory<HistoryLocationState>;
	/**
	 * The route path for configuring navigation to the application.
	 * This string should not include the base path from HTTP.
	 *
	 * @deprecated Use {@link AppMountParameters.history} instead.
	 * remove after https://github.com/elastic/kibana/issues/132600 is done
	 *
	 * @example
	 *
	 * How to configure react-router with a base path:
	 *
	 * ```ts
	 * // inside your plugin's setup function
	 * export class MyPlugin implements Plugin {
	 *   setup({ application }) {
	 *     application.register({
	 *      id: 'my-app',
	 *      appRoute: '/my-app',
	 *      async mount(params) {
	 *        const { renderApp } = await import('./application');
	 *        return renderApp(params);
	 *      },
	 *    });
	 *  }
	 * }
	 * ```
	 *
	 * ```ts
	 * // application.tsx
	 * import React from 'react';
	 * import ReactDOM from 'react-dom';
	 * import { BrowserRouter, Route } from 'react-router-dom';
	 *
	 * import { CoreStart, AppMountParameters } from 'src/core/public';
	 * import { MyPluginDepsStart } from './plugin';
	 *
	 * export renderApp = ({ appBasePath, element }: AppMountParameters) => {
	 *   ReactDOM.render(
	 *     // pass `appBasePath` to `basename`
	 *     <BrowserRouter basename={appBasePath}>
	 *       <Route path="/" exact component={HomePage} />
	 *     </BrowserRouter>,
	 *     element
	 *   );
	 *
	 *   return () => ReactDOM.unmountComponentAtNode(element);
	 * }
	 * ```
	 */
	appBasePath: string;
	/**
	 * A function that can be used to register a handler that will be called
	 * when the user is leaving the current application, allowing to
	 * prompt a confirmation message before actually changing the page.
	 *
	 * This will be called either when the user goes to another application, or when
	 * trying to close the tab or manually changing the url.
	 *
	 *
	 * @example
	 *
	 * ```ts
	 * // application.tsx
	 * import React from 'react';
	 * import ReactDOM from 'react-dom';
	 * import { BrowserRouter, Route } from 'react-router-dom';
	 *
	 * import { CoreStart, AppMountParameters } from 'src/core/public';
	 * import { MyPluginDepsStart } from './plugin';
	 *
	 * export renderApp = ({ element, history, onAppLeave }: AppMountParameters) => {
	 *    const { renderApp, hasUnsavedChanges } = await import('./application');
	 *    onAppLeave(actions => {
	 *      if(hasUnsavedChanges()) {
	 *        return actions.confirm('Some changes were not saved. Are you sure you want to leave?');
	 *      }
	 *      return actions.default();
	 *    });
	 *    return renderApp({ element, history });
	 * }
	 * ```
	 *
	 * @remarks prefer {@link ScopedHistory.block} instead
	 * Resources with names containing percent sign with other special characters or
	 * containing `%25` sequence can experience navigation issues. Refs https://github.com/elastic/kibana/issues/82440 and https://github.com/elastic/kibana/issues/132600
  
	 */
	onAppLeave: (handler: AppLeaveHandler) => void;
	/**
	 * A function that can be used to set the mount point used to populate the application action container
	 * in the chrome header.
	 *
	 * Calling the handler multiple time will erase the current content of the action menu with the mount from the latest call.
	 * Calling the handler with `undefined` will unmount the current mount point.
	 * Calling the handler after the application has been unmounted will have no effect.
	 *
	 * @example
	 *
	 * ```ts
	 * // application.tsx
	 * import React from 'react';
	 * import ReactDOM from 'react-dom';
	 * import { BrowserRouter, Route } from 'react-router-dom';
	 *
	 * import { CoreStart, AppMountParameters } from 'src/core/public';
	 * import { MyPluginDepsStart } from './plugin';
	 *
	 * export renderApp = ({ element, history, setHeaderActionMenu }: AppMountParameters) => {
	 *    const { renderApp } = await import('./application');
	 *    const { renderActionMenu } = await import('./action_menu');
	 *    setHeaderActionMenu((element) => {
	 *      return renderActionMenu(element);
	 *    })
	 *    return renderApp({ element, history });
	 * }
	 * ```
	 */
	setHeaderActionMenu: (menuMount: MountPoint | undefined) => void;
	/**
	 * An observable emitting {@link CoreTheme | Core's theme}.
	 * Should be used when mounting the application to include theme information.
	 *
	 * @example
	 * When mounting a react application:
	 * ```ts
	 * // application.tsx
	 * import React from 'react';
	 * import ReactDOM from 'react-dom';
	 *
	 * import { AppMountParameters } from 'src/core/public';
	 * import { wrapWithTheme } from 'src/platform/plugins/shared/kibana_react';
	 * import { MyApp } from './app';
	 *
	 * export renderApp = ({ element, theme$ }: AppMountParameters) => {
	 *    ReactDOM.render(wrapWithTheme(<MyApp/>, theme$), element);
	 *    return () => ReactDOM.unmountComponentAtNode(element);
	 * }
	 * ```
	 */
	theme$: Observable<CoreTheme>;
}
interface AppNavOptions {
	/**
	 * An ordinal used to sort nav links relative to one another for display.
	 */
	order?: number;
	/**
	 * A tooltip shown when hovering over app link.
	 */
	tooltip?: string;
	/**
	 * A EUI iconType that will be used for the app's icon. This icon
	 * takes precedence over the `icon` property.
	 */
	euiIconType?: string;
	/**
	 * A URL to an image file used as an icon. Used as a fallback
	 * if `euiIconType` is not provided.
	 */
	icon?: string;
}
interface ApplicationSetup {
	/**
	 * Register an mountable application to the system.
	 * @param app - an {@link App}
	 * @typeParam HistoryLocationState - shape of the `History` state on {@link AppMountParameters.history}, defaults to `unknown`.
	 */
	register<HistoryLocationState = unknown>(app: App<HistoryLocationState>): void;
	/**
	 * Register an application updater that can be used to change the {@link AppUpdatableFields} fields
	 * of all applications at runtime.
	 *
	 * This is meant to be used by plugins that needs to updates the whole list of applications.
	 * To only updates a specific application, use the `updater$` property of the registered application instead.
	 *
	 * @example
	 *
	 * How to register an application updater that disables some applications:
	 *
	 * ```ts
	 * // inside your plugin's setup function
	 * export class MyPlugin implements Plugin {
	 *   setup({ application }) {
	 *     application.registerAppUpdater(
	 *       new BehaviorSubject<AppUpdater>(app => {
	 *          if (myPluginApi.shouldDisable(app))
	 *            return {
	 *              status: AppStatus.inaccessible,
	 *            };
	 *        })
	 *      );
	 *     }
	 * }
	 * ```
	 */
	registerAppUpdater(appUpdater$: Observable<AppUpdater>): void;
}
interface ApplicationStart {
	/**
	 * Gets the read-only capabilities.
	 */
	capabilities: RecursiveReadonly<Capabilities>;
	/**
	 * Observable emitting the list of currently registered apps and their associated status.
	 *
	 * @remarks
	 * Applications disabled by {@link Capabilities} will not be present in the map. Applications manually disabled from
	 * the client-side using an {@link AppUpdater | application updater} are present, with their status properly set as `inaccessible`.
	 */
	applications$: Observable<ReadonlyMap<string, PublicAppInfo>>;
	/**
	 * Navigate to a given app.
	 * If a plugin is disabled any applications it registers won't be available either.
	 * Before rendering a UI element that a user could use to navigate to another application,
	 * first check if the destination application is actually available using the isAppRegistered API.
	 *
	 * @param appId - The identifier of the app to navigate to
	 * @param options - navigation options
	 */
	navigateToApp(appId: string, options?: NavigateToAppOptions): Promise<void>;
	/**
	 * Navigate to given URL in a SPA friendly way when possible (when the URL will redirect to a valid application
	 * within the current basePath).
	 *
	 * **Important**: This method always uses `history.push()` and creates a NEW entry in the browser history stack.
	 * This is appropriate for user-initiated navigation (e.g., clicking links or buttons), but NOT for:
	 * - **In-app navigation** within the same React Router instance - use React Router's `history.replace()` instead
	 * - **Conditional redirects** in components - use `navigateToApp(appId, { replace: true })` for cross-app redirects
	 *
	 * The method resolves pathnames the same way browsers do when resolving a `<a href>` value. The provided `url` can be:
	 * - an absolute URL
	 * - an absolute path
	 * - a path relative to the current URL (window.location.href)
	 *
	 * If all these criteria are true for the given URL:
	 * - (only for absolute URLs) The origin of the URL matches the origin of the browser's current location
	 * - The resolved pathname of the provided URL/path starts with the current basePath (eg. /mybasepath/s/my-space)
	 * - The pathname segment after the basePath matches any known application route (eg. /app/<id>/ or any application's `appRoute` configuration)
	 *
	 * Then a SPA navigation will be performed using `navigateToApp` using the corresponding application and path.
	 * Otherwise, fallback to a full page reload to navigate to the url using `window.location.assign`.
	 *
	 * @example
	 * ```ts
	 * // current url: `https://kibana:8080/base-path/s/my-space/app/dashboard`
	 *
	 * // will call `application.navigateToApp('discover', { path: '/some-path?foo=bar'})`
	 * application.navigateToUrl('https://kibana:8080/base-path/s/my-space/app/discover/some-path?foo=bar')
	 * application.navigateToUrl('/base-path/s/my-space/app/discover/some-path?foo=bar')
	 * application.navigateToUrl('./discover/some-path?foo=bar')
	 *
	 * // will perform a full page reload using `window.location.assign`
	 * application.navigateToUrl('https://elsewhere:8080/base-path/s/my-space/app/discover/some-path') // origin does not match
	 * application.navigateToUrl('/app/discover/some-path') // does not include the current basePath
	 * application.navigateToUrl('/base-path/s/my-space/app/unknown-app/some-path') // unknown application
	 * application.navigateToUrl('../discover') // resolve to `/base-path/s/my-space/discover` which is not a path of a known app.
	 * application.navigateToUrl('../../../other-space/discover') // resolve to `/base-path/s/other-space/discover` which is not within the current basePath.
	 * ```
	 *
	 * @param url - an absolute URL, an absolute path or a relative path, to navigate to.
	 * @param options - navigation options
	 */
	navigateToUrl(url: string, options?: NavigateToUrlOptions): Promise<void>;
	/**
	 * Checks whether a given application is registered.
	 *
	 * @param appId - The identifier of the app to check
	 * @returns true if the given appId is registered in the system, false otherwise.
	 */
	isAppRegistered(appId: string): boolean;
	/**
	 * Returns the absolute path (or URL) to a given app, including the global base path.
	 *
	 * By default, it returns the absolute path of the application (e.g `/basePath/app/my-app`).
	 * Use the `absolute` option to generate an absolute url instead (e.g `http://host:port/basePath/app/my-app`)
	 *
	 * Note that when generating absolute urls, the origin (protocol, host and port) are determined from the browser's current location.
	 *
	 * @param appId
	 * @param options.path - optional path inside application to deep link to
	 * @param options.absolute - if true, will returns an absolute url instead of a relative one
	 */
	getUrlForApp(appId: string, options?: {
		path?: string;
		absolute?: boolean;
		deepLinkId?: string;
	}): string;
	/**
	 * An observable that emits the current application id and each subsequent id update.
	 */
	currentAppId$: Observable<string | undefined>;
	/**
	 * An observable that emits the current path#hash and each subsequent update using the global history instance
	 */
	currentLocation$: Observable<string>;
}
interface AuthcDisabled {
	enabled: false;
	reason: string;
}
interface AuthcEnabled {
	enabled: true | "optional";
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
interface ChromeBadge {
	text: string;
	tooltip: string;
	iconType?: IconType;
}
interface ChromeBreadcrumb extends EuiBreadcrumb {
	/**
	 * The deepLinkId can be used to merge the navigational breadcrumbs set via project navigation
	 * with the deeper context breadcrumbs set via the `chrome.setBreadcrumbs` API.
	 */
	deepLinkId?: AppDeepLinkId;
}
interface ChromeBreadcrumbsAppendExtension {
	content: MountPoint<HTMLDivElement>;
	/** The order in which the extension should be appended to the breadcrumbs. Default is 50 */
	order?: number;
}
interface ChromeDocTitle {
	/**
	 * Changes the current document title.
	 *
	 * @example
	 * How to change the title of the document
	 * ```ts
	 * chrome.docTitle.change('My application title')
	 * chrome.docTitle.change(['My application', 'My section'])
	 * ```
	 *
	 * @param newTitle The new title to set, either a string or string array
	 */
	change(newTitle: string | string[]): void;
	/**
	 * Resets the document title to it's initial value.
	 * (meaning the one present in the title meta at application load.)
	 */
	reset(): void;
}
interface ChromeGlobalHelpExtensionMenuLink extends ChromeHelpExtensionMenuCustomLink {
	/**
	 * Highest priority items are listed at the top of the list of links.
	 */
	priority: number;
}
interface ChromeHelpExtension {
	/**
	 * Provide your plugin's name to create a header for separation
	 */
	appName: string;
	/**
	 * Creates unified links for sending users to documentation, GitHub, Discuss, or a custom link/button
	 */
	links?: ChromeHelpExtensionMenuLink[];
	/**
	 * Custom content to occur below the list of links
	 */
	content?: (element: HTMLDivElement, menuActions: ChromeHelpMenuActions) => () => void;
}
interface ChromeHelpExtensionMenuCustomLink extends ChromeHelpExtensionLinkBase {
	/**
	 * Extend EuiButtonEmpty to provide extra functionality
	 */
	linkType: "custom";
	/**
	 * URL of the link
	 */
	href: string;
	/**
	 * Content of the button (in lieu of `children`)
	 */
	content: React$1.ReactNode;
	/**
	 * Opens link in new tab
	 */
	external?: boolean;
}
interface ChromeHelpExtensionMenuDiscussLink extends ChromeHelpExtensionLinkBase {
	/**
	 * Creates a generic give feedback link with comment icon
	 */
	linkType: "discuss";
	/**
	 * URL to discuss page.
	 * i.e. `https://discuss.elastic.co/c/${appName}`
	 */
	href: string;
}
interface ChromeHelpExtensionMenuDocumentationLink extends ChromeHelpExtensionLinkBase {
	/**
	 * Creates a deep-link to app-specific documentation
	 */
	linkType: "documentation";
	/**
	 * URL to documentation page.
	 * i.e. `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${appName}.html`,
	 */
	href: string;
}
interface ChromeHelpExtensionMenuGitHubLink extends ChromeHelpExtensionLinkBase {
	/**
	 * Creates a link to a new github issue in the Kibana repo
	 */
	linkType: "github";
	/**
	 * Include at least one app-specific label to be applied to the new github issue
	 */
	labels: string[];
	/**
	 * Provides initial text for the title of the issue
	 */
	title?: string;
}
interface ChromeHelpMenuActions {
	hideHelpMenu: () => void;
}
interface ChromeHelpMenuLink {
	title: string;
	href?: string;
	onClick?: () => void;
	dataTestSubj?: string;
}
interface ChromeNavControl {
	order?: number;
	mount: MountPoint;
}
interface ChromeNavControls {
	/** Register a nav control to be presented on the bottom-left side of the chrome header. */
	registerLeft(navControl: ChromeNavControl): void;
	/** Register a nav control to be presented on the top-right side of the chrome header. */
	registerRight(navControl: ChromeNavControl): void;
	/** Register a nav control to be presented on the top-center side of the chrome header. */
	registerCenter(navControl: ChromeNavControl): void;
	/** Register an extension to be presented to the left of the top-right side of the chrome header. */
	registerExtension(navControl: ChromeNavControl): void;
	/** Set the help menu links */
	setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;
	/** @internal */
	getLeft$(): Observable<ChromeNavControl[]>;
	/** @internal */
	getRight$(): Observable<ChromeNavControl[]>;
	/** @internal */
	getCenter$(): Observable<ChromeNavControl[]>;
	/** @internal */
	getExtension$(): Observable<ChromeNavControl[]>;
	/** @internal */
	getHelpMenuLinks$(): Observable<ChromeHelpMenuLink[]>;
}
interface ChromeNavLink {
	/**
	 * A unique identifier for looking up links.
	 */
	readonly id: string;
	/**
	 * The title of the application.
	 */
	readonly title: string;
	/**
	 * The category the app lives in
	 */
	readonly category?: AppCategory;
	/**
	 * The base route used to open the root of an application.
	 */
	readonly baseUrl: string;
	/**
	 * The route used to open the default path and the deep links of an application.
	 */
	readonly url: string;
	/**
	 * An ordinal used to sort nav links relative to one another for display.
	 */
	readonly order?: number;
	/**
	 * A tooltip shown when hovering over an app link.
	 */
	readonly tooltip?: string;
	/**
	 * A EUI iconType that will be used for the app's icon. This icon
	 * takes precedence over the `icon` property.
	 */
	readonly euiIconType?: string;
	/**
	 * A URL to an image file used as an icon. Used as a fallback
	 * if `euiIconType` is not provided.
	 */
	readonly icon?: string;
	/**
	 * Settled state between `url`, `baseUrl`, and `active`
	 */
	readonly href: string;
	/**
	 * List of locations where the nav link should be visible.
	 *
	 * Accepts the following values:
	 * - "globalSearch": the link will appear in the global search bar
	 * - "home": the link will appear on the Kibana home page
	 * - "kibanaOverview": the link will appear in the Kibana overview page
	 * - "sideNav": the link will appear in the side navigation.
	 *   Note: "sideNav" will be deprecated when we change the navigation to "solutions" style.
	 *
	 * @default ['globalSearch']
	 */
	readonly visibleIn: AppDeepLinkLocations[];
}
interface ChromeNavLinks {
	/**
	 * Get an observable for a sorted list of navlinks.
	 */
	getNavLinks$(): Observable<Array<Readonly<ChromeNavLink>>>;
	/**
	 * Get the state of a navlink at this point in time.
	 * @param id
	 */
	get(id: string): ChromeNavLink | undefined;
	/**
	 * Get the current state of all navlinks.
	 */
	getAll(): Array<Readonly<ChromeNavLink>>;
	/**
	 * Check whether or not a navlink exists.
	 * @param id
	 */
	has(id: string): boolean;
	/**
	 * Enable forced navigation mode, which will trigger a page refresh
	 * when a nav link is clicked and only the hash is updated.
	 *
	 * @remarks
	 * This is only necessary when rendering the status page in place of another
	 * app, as links to that app will set the current URL and change the hash, but
	 * the routes for the correct are not loaded so nothing will happen.
	 * https://github.com/elastic/kibana/pull/29770
	 *
	 * Used only by status_page plugin
	 */
	enableForcedAppSwitcherNavigation(): void;
	/**
	 * An observable of the forced app switcher state.
	 */
	getForceAppSwitcherNavigation$(): Observable<boolean>;
}
interface ChromeRecentlyAccessed {
	/**
	 * Adds a new item to the recently accessed history.
	 *
	 * @example
	 * ```js
	 * chrome.recentlyAccessed.add('/app/map/1234', 'Map 1234', '1234');
	 * ```
	 *
	 * @param link a relative URL to the resource (not including the {@link HttpStart.basePath | `http.basePath`})
	 * @param label the label to display in the UI
	 * @param id a unique string used to de-duplicate the recently accessed list.
	 */
	add(link: string, label: string, id: string): void;
	/**
	 * Gets an Array of the current recently accessed history.
	 *
	 * @example
	 * ```js
	 * chrome.recentlyAccessed.get().forEach(console.log);
	 * ```
	 */
	get(): ChromeRecentlyAccessedHistoryItem[];
	/**
	 * Gets an Observable of the array of recently accessed history.
	 *
	 * @example
	 * ```js
	 * chrome.recentlyAccessed.get$().subscribe(console.log);
	 * ```
	 */
	get$(): Observable<ChromeRecentlyAccessedHistoryItem[]>;
}
interface ChromeRecentlyAccessedHistoryItem {
	link: string;
	label: string;
	id: string;
}
interface ChromeSetBreadcrumbsParams {
	/**
	 * Declare the breadcrumbs for the project/solution type navigation in stateful.
	 * Those breadcrumbs correspond to the serverless breadcrumbs declaration.
	 */
	project?: {
		/**
		 * The breadcrumb value to set. Can be a single breadcrumb or an array of breadcrumbs.
		 */
		value: ChromeBreadcrumb | ChromeBreadcrumb[];
		/**
		 * Indicates whether the breadcrumb should be absolute (replaces the full path) or relative.
		 * @default false
		 */
		absolute?: boolean;
	};
}
interface ChromeStart {
	/** {@inheritdoc ChromeNavLinks} */
	navLinks: ChromeNavLinks;
	/** {@inheritdoc ChromeNavControls} */
	navControls: ChromeNavControls;
	/** {@inheritdoc ChromeRecentlyAccessed} */
	recentlyAccessed: ChromeRecentlyAccessed;
	/** {@inheritdoc ChromeDocTitle} */
	docTitle: ChromeDocTitle;
	/**
	 * Get an observable of the current visibility state of the chrome.
	 */
	getIsVisible$(): Observable<boolean>;
	/**
	 * Set the temporary visibility for the chrome. This does nothing if the chrome is hidden
	 * by default and should be used to hide the chrome for things like full-screen modes
	 * with an exit button.
	 */
	setIsVisible(isVisible: boolean): void;
	/**
	 * Get an observable of the current badge
	 */
	getBadge$(): Observable<ChromeBadge | undefined>;
	/**
	 * Override the current badge
	 */
	setBadge(badge?: ChromeBadge): void;
	/**
	 * Set global footer; Meant to be used by developer toolbar
	 */
	setGlobalFooter(node: React$1.ReactNode): void;
	/**
	 * Get an observable of the current list of breadcrumbs
	 */
	getBreadcrumbs$(): Observable<ChromeBreadcrumb[]>;
	/**
	 * Override the current set of breadcrumbs
	 */
	setBreadcrumbs(newBreadcrumbs: ChromeBreadcrumb[], params?: ChromeSetBreadcrumbsParams): void;
	/**
	 * Get an observable of the current extensions appended to breadcrumbs
	 */
	getBreadcrumbsAppendExtensions$(): Observable<ChromeBreadcrumbsAppendExtension[]>;
	/**
	 * Mount an element next to the last breadcrumb
	 */
	setBreadcrumbsAppendExtension(breadcrumbsAppendExtension: ChromeBreadcrumbsAppendExtension): () => void;
	/**
	 * Get an observable of the current custom nav link
	 */
	getCustomNavLink$(): Observable<Partial<ChromeNavLink> | undefined>;
	/**
	 * Override the current set of custom nav link
	 */
	setCustomNavLink(newCustomNavLink?: Partial<ChromeNavLink>): void;
	/**
	 * Override the default links shown in the help menu
	 */
	setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;
	/**
	 * Get the list of the registered global help extension menu links
	 */
	getGlobalHelpExtensionMenuLinks$(): Observable<ChromeGlobalHelpExtensionMenuLink[]>;
	/**
	 * Append a global help extension menu link
	 */
	registerGlobalHelpExtensionMenuLink(globalHelpExtensionMenuLink: ChromeGlobalHelpExtensionMenuLink): void;
	/**
	 * Get an observable of the current custom help content
	 */
	getHelpExtension$(): Observable<ChromeHelpExtension | undefined>;
	/**
	 * Override the current set of custom help content
	 */
	setHelpExtension(helpExtension?: ChromeHelpExtension): void;
	/**
	 * Override the default support URL shown in the help menu
	 * @param url The updated support URL
	 */
	setHelpSupportUrl(url: string): void;
	/**
	 * Get the support URL shown in the help menu
	 */
	getHelpSupportUrl$(): Observable<string>;
	/**
	 * Set the banner that will appear on top of the chrome header.
	 *
	 * @remarks Using `undefined` when invoking this API will remove the banner.
	 */
	setHeaderBanner(headerBanner?: ChromeUserBanner): void;
	/**
	 * Get an observable of the current header banner presence state.
	 */
	hasHeaderBanner$(): Observable<boolean>;
	/**
	 * Sets the style type of the chrome.
	 * @param style The style type to apply to the chrome.
	 */
	setChromeStyle(style: ChromeStyle): void;
	/**
	 * Get an observable of the current style type of the chrome.
	 */
	getChromeStyle$(): Observable<ChromeStyle>;
	sideNav: {
		/**
		 * Get an observable of the current collapsed state of the side nav.
		 */
		getIsCollapsed$(): Observable<boolean>;
		/**
		 * Set the collapsed state of the side nav.
		 * @param isCollapsed The collapsed state of the side nav.
		 */
		setIsCollapsed(isCollapsed: boolean): void;
		/**
		 * Get an observable of the visibility state of the feedback button in the side nav.
		 */
		getIsFeedbackBtnVisible$: () => Observable<boolean>;
		/**
		 * Set the visibility state of the feedback button in the side nav.
		 * @param isVisible The visibility state of the feedback button in the side nav.
		 */
		setIsFeedbackBtnVisible: (isVisible: boolean) => void;
	};
	/**
	 * Get the id of the currently active project navigation or `null` otherwise.
	 */
	getActiveSolutionNavId$(): Observable<SolutionId | null>;
}
interface ChromeUserBanner {
	content: MountPoint<HTMLDivElement>;
}
interface ConfigDeprecationDetails extends BaseDeprecationDetails {
	configPath: string;
	deprecationType: "config";
}
interface CoreAuthenticationService {
	/**
	 * Returns currently authenticated user
	 * and throws if current user isn't authenticated.
	 */
	getCurrentUser(): Promise<AuthenticatedUser>;
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
interface CoreSecurityDelegateContract {
	authc: AuthenticationServiceContract;
}
interface CoreSetup<TPluginsStart extends Record<string, any> = {}, TStart = unknown> {
	/** {@link AnalyticsServiceSetup} */
	analytics: AnalyticsServiceSetup;
	/** {@link ApplicationSetup} */
	application: ApplicationSetup;
	/** {@link CustomBrandingSetup} */
	customBranding: CustomBrandingSetup;
	/** {@link FatalErrorsSetup} */
	fatalErrors: FatalErrorsSetup;
	/** {@link FeatureFlagsSetup} */
	featureFlags: FeatureFlagsSetup;
	/** {@link HttpSetup} */
	http: HttpSetup;
	/** {@link CoreDiServiceSetup} */
	injection: CoreDiServiceSetup;
	/** {@link NotificationsSetup} */
	notifications: NotificationsSetup;
	/** {@link IUiSettingsClient} */
	/** @Deprecated Use {@link CoreSetup.settings} instead */
	uiSettings: IUiSettingsClient;
	/** {@link SettingsStart} */
	settings: SettingsStart;
	/** {@link ExecutionContextSetup} */
	executionContext: ExecutionContextSetup;
	/** {@link ThemeServiceSetup} */
	theme: ThemeServiceSetup;
	/** {@link PluginsServiceSetup} */
	plugins: PluginsServiceSetup;
	/** {@link SecurityServiceSetup} */
	security: SecurityServiceSetup;
	/** {@link UserProfileServiceSetup} */
	userProfile: UserProfileServiceSetup;
	/** {@link StartServicesAccessor} */
	getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
}
interface CoreStart {
	/** {@link AnalyticsServiceStart} */
	analytics: AnalyticsServiceStart;
	/** {@link ApplicationStart} */
	application: ApplicationStart;
	/** {@link ChromeStart} */
	chrome: ChromeStart;
	/** {@link CustomBrandingStart} */
	customBranding: CustomBrandingStart;
	/** {@link DocLinksStart} */
	docLinks: DocLinksStart;
	/** {@link ExecutionContextStart} */
	executionContext: ExecutionContextStart;
	/** {@link FeatureFlagsStart} */
	featureFlags: FeatureFlagsStart;
	/** {@link HttpStart} */
	http: HttpStart;
	/** {@link CoreDiServiceStart} */
	injection: CoreDiServiceStart;
	/** {@link I18nStart} */
	i18n: I18nStart;
	/** {@link NotificationsStart} */
	notifications: NotificationsStart;
	/** {@link OverlayStart} */
	overlays: OverlayStart;
	/** {@link IUiSettingsClient} */
	/** @Deprecated Use {@link CoreStart.settings} instead */
	uiSettings: IUiSettingsClient;
	/** {@link SettingsStart} */
	settings: SettingsStart;
	/** {@link FatalErrorsStart} */
	fatalErrors: FatalErrorsStart;
	/** {@link DeprecationsServiceStart} */
	deprecations: DeprecationsServiceStart;
	/** {@link ThemeServiceStart} */
	theme: ThemeServiceStart;
	/** {@link PluginsServiceStart} */
	plugins: PluginsServiceStart;
	/** {@link PricingServiceStart} */
	pricing: PricingServiceStart;
	/** {@link SecurityServiceStart} */
	security: SecurityServiceStart;
	/** {@link UserProfileServiceStart} */
	userProfile: UserProfileServiceStart;
	/** {@link RenderingService} */
	rendering: RenderingService;
}
interface CoreTheme {
	/** is dark mode enabled or not */
	readonly darkMode: boolean;
	/**
	 * Name of the active theme
	 */
	readonly name: string;
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
	customBranding$: Observable<CustomBranding>;
	hasCustomBranding$: Observable<boolean>;
}
interface CustomBrandingStart {
	customBranding$: Observable<CustomBranding>;
	hasCustomBranding$: Observable<boolean>;
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
interface DeprecationsServiceStart {
	/**
	 * Grabs deprecations details for all domains.
	 */
	getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
	/**
	 * Grabs deprecations for a specific domain.
	 *
	 * @param {string} domainId
	 */
	getDeprecations: (domainId: string) => Promise<DomainDeprecationDetails[]>;
	/**
	 * Returns a boolean if the provided deprecation can be automatically resolvable.
	 *
	 * @param {DomainDeprecationDetails} details
	 */
	isDeprecationResolvable: (details: DomainDeprecationDetails) => boolean;
	/**
	 * Calls the correctiveActions.api to automatically resolve the depprecation.
	 *
	 * @param {DomainDeprecationDetails} details
	 */
	resolveDeprecation: (details: DomainDeprecationDetails) => Promise<ResolveDeprecationResponse>;
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
interface DocLinksStart {
	readonly DOC_LINK_VERSION: string;
	readonly ELASTIC_WEBSITE_URL: string;
	readonly links: DocLinks;
}
interface ESQLControlVariable {
	key: string;
	value: string | number | (string | number)[];
	type: ESQLVariableType;
}
interface EnvironmentMode {
	name: "development" | "production";
	dev: boolean;
	prod: boolean;
}
interface ErrorToastOptions extends ToastOptions {
	/**
	 * The title of the toast and the dialog when expanding the message.
	 */
	title: string;
	/**
	 * The message to be shown in the toast. If this is not specified the error's
	 * message will be shown in the toast instead. Overwriting that message can
	 * be used to provide more user-friendly toasts. If you specify this, the error
	 * message will still be shown in the detailed error modal.
	 */
	toastMessage?: string;
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
	 * The current context observable
	 **/
	context$: Observable<KibanaExecutionContext>;
	/**
	 * Set the current top level context
	 **/
	set(c$: KibanaExecutionContext): void;
	/**
	 * Get the current top level context
	 **/
	get(): KibanaExecutionContext;
	/**
	 * clears the context
	 **/
	clear(): void;
	/**
	 * returns apm labels
	 **/
	getAsLabels(): Labels;
	/**
	 * merges the current top level context with the specific event context
	 **/
	withGlobalContext(context?: KibanaExecutionContext): KibanaExecutionContext;
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
interface ExpressionRenderError extends Error {
	type?: string;
	original?: Error;
}
interface ExpressionRenderHandlerParams {
	onRenderError?: RenderErrorHandlerFnType;
	renderMode?: RenderMode;
	syncColors?: boolean;
	syncCursor?: boolean;
	syncTooltips?: boolean;
	interactive?: boolean;
	hasCompatibleActions?: (event: ExpressionRendererEvent) => Promise<boolean>;
	getCompatibleCellValueActions?: (data: object[]) => Promise<unknown[]>;
	executionContext?: KibanaExecutionContext;
}
interface ExpressionRendererParams extends IExpressionLoaderParams {
	debounce?: number;
	expression: string | ExpressionAstExpression;
	hasCustomErrorRenderer?: boolean;
	onData$?<TData, TInspectorAdapters extends unknown>(data: TData, adapters?: TInspectorAdapters, partial?: boolean): void;
	onEvent?(event: ExpressionRendererEvent): void;
	onRender$?(item: number): void;
	/**
	 * An observable which can be used to re-run the expression without destroying the component
	 */
	reload$?: Observable<unknown>;
	abortController?: AbortController;
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
interface FatalError<T extends Error | string = Error | string> {
	/**
	 * The error to display.
	 */
	error: T;
	/**
	 * A prefix to the error message.
	 */
	source?: string;
}
interface FatalErrorsSetup {
	/**
	 * Add a new fatal error. This will stop the Kibana Public Core and display
	 * a fatal error screen with details about the Kibana build and the error.
	 *
	 * @param error - The error to display
	 * @param source - Adds a prefix of the form `${source}: ` to the error message
	 */
	add(error: string | Error, source?: string): never;
	/**
	 * Register custom error handler for specific error type.
	 * @param condition - A function that checks if the error is of a specific type.
	 * @param handler
	 */
	catch<T extends string | Error>(condition: (error: FatalError) => error is FatalError<T>, handler: (errors: Array<FatalError<T>>) => React$1.ReactNode): void;
	/**
	 * Register custom error handler for specific error type.
	 * @param condition - A function that checks if the error is of a specific type.
	 * @param handler
	 */
	catch(condition: (error: FatalError) => boolean, handler: (errors: FatalError[]) => React$1.ReactNode): void;
}
interface FeatureDeprecationDetails extends BaseDeprecationDetails {
	deprecationType?: "feature" | undefined;
}
interface FeatureFlagsSetup {
	/**
	 * Used for bootstrapping the browser-side client with a seed of the feature flags for faster load-times.
	 * @remarks It shouldn't be used to evaluate the feature flags because it won't report usage.
	 */
	getInitialFeatureFlags: () => Record<string, unknown>;
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
	appendContext(contextToAppend: EvaluationContext): Promise<void>;
}
interface FeatureFlagsStart {
	/**
	 * Appends new keys to the evaluation context.
	 * @param contextToAppend The additional keys that should be appended/modified in the evaluation context.
	 * @public
	 */
	appendContext(contextToAppend: EvaluationContext): Promise<void>;
	/**
	 * Evaluates a boolean flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getBooleanValue(flagName: string, fallbackValue: boolean): boolean;
	/**
	 * Evaluates a string flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Value;
	/**
	 * Evaluates a number flag
	 * @param flagName The flag ID to evaluate
	 * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
	 * @public
	 */
	getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Value;
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
interface FoundPluginContractResolverResponseItem<ContractType = unknown> {
	found: true;
	contract: ContractType;
}
interface FunctionCacheItem {
	value: unknown;
	time: number;
	sideEffectFn?: () => void;
}
interface GetUiSettingsContext {
	request?: KibanaRequest;
}
interface GetUserProfileResponse<D extends UserProfileData = UserProfileData> extends UserProfileWithSecurity<D> {
	/**
	 * Information about the currently authenticated user that owns the profile.
	 */
	user: UserProfileWithSecurity["user"] & Pick<AuthenticatedUser, "authentication_provider">;
}
interface HttpFetchOptions extends HttpRequestInit {
	/**
	 * The query string for an HTTP request. See {@link HttpFetchQuery}.
	 */
	query?: HttpFetchQuery;
	/**
	 * Whether or not the request should automatically prepend the basePath. Defaults to `true`.
	 */
	prependBasePath?: boolean;
	/**
	 * Headers to send with the request. See {@link HttpHeadersInit}.
	 */
	headers?: HttpHeadersInit;
	/**
	 * Whether or not the request should include the "system request" header to differentiate an end user request from
	 * Kibana internal request.
	 * Can be read on the server-side using KibanaRequest#isSystemRequest. Defaults to `false`.
	 */
	asSystemRequest?: boolean;
	/**
	 * When `true` the return type of {@link HttpHandler} will be an {@link HttpResponse} with detailed request and
	 * response information. When `false`, the return type will just be the parsed response body. Defaults to `false`.
	 */
	asResponse?: boolean;
	/**
	 * When true, the response from the `fetch` call will be returned as is, without being awaited or processed.
	 * Defaults to `false`.
	 */
	rawResponse?: boolean;
	context?: KibanaExecutionContext;
	/**
	 * When defined, the API version string used to populate the ELASTIC_HTTP_VERSION_HEADER.
	 * Defaults to undefined.
	 */
	version?: ApiVersion;
}
interface HttpFetchOptionsWithPath extends HttpFetchOptions {
	path: string;
}
interface HttpFetchQuery {
	/**
	 * TypeScript note: Technically we should use this interface instead, but @types/node uses the below stricter
	 * definition, so to avoid TypeScript errors, we'll restrict our version.
	 *
	 * [key: string]:
	 *   | string
	 *   | number
	 *   | boolean
	 *   | Array<string | number | boolean>
	 *   | undefined
	 *   | null;
	 */
	[key: string]: string | number | boolean | string[] | number[] | boolean[] | undefined | null;
}
interface HttpHandler {
	<TResponseBody = unknown>(path: string, options: HttpFetchOptions & {
		asResponse: true;
	}): Promise<HttpResponse<TResponseBody>>;
	<TResponseBody = unknown>(options: HttpFetchOptionsWithPath & {
		asResponse: true;
	}): Promise<HttpResponse<TResponseBody>>;
	<TResponseBody = unknown>(path: string, options?: HttpFetchOptions): Promise<TResponseBody>;
	<TResponseBody = unknown>(options: HttpFetchOptionsWithPath): Promise<TResponseBody>;
}
interface HttpHeadersInit {
	[name: string]: any;
}
interface HttpInterceptor {
	/**
	 * Define an interceptor to be executed before a request is sent.
	 * @param request
	 * @param controller {@link IHttpInterceptController}
	 */
	request?(fetchOptions: Readonly<HttpFetchOptionsWithPath>, controller: IHttpInterceptController): MaybePromise<Partial<HttpFetchOptionsWithPath>> | void;
	/**
	 * Define an interceptor to be executed if a request interceptor throws an error or returns a rejected Promise.
	 * @param httpErrorRequest {@link HttpInterceptorRequestError}
	 * @param controller {@link IHttpInterceptController}
	 */
	requestError?(httpErrorRequest: HttpInterceptorRequestError, controller: IHttpInterceptController): MaybePromise<Partial<HttpFetchOptionsWithPath>> | void;
	/**
	 * Define an interceptor to be executed at the fetch call.
	 * @param next {@link HttpSetup.fetch}
	 * @param fetchOptions {@link HttpFetchOptionsWithPath}
	 * @param controller {@link IHttpInterceptController}
	 */
	fetch?(next: (fetchOptions: HttpFetchOptionsWithPath) => Promise<HttpResponse>, fetchOptions: Readonly<HttpFetchOptionsWithPath>, controller: IHttpInterceptController): Promise<HttpResponse>;
	/**
	 * Define an interceptor to be executed after a response is received.
	 * @param httpResponse {@link HttpResponse}
	 * @param controller {@link IHttpInterceptController}
	 */
	response?(httpResponse: HttpResponse, controller: IHttpInterceptController): MaybePromise<IHttpResponseInterceptorOverrides> | void;
	/**
	 * Define an interceptor to be executed if a response interceptor throws an error or returns a rejected Promise.
	 * @param httpErrorResponse {@link HttpInterceptorResponseError}
	 * @param controller {@link IHttpInterceptController}
	 */
	responseError?(httpErrorResponse: HttpInterceptorResponseError, controller: IHttpInterceptController): MaybePromise<IHttpResponseInterceptorOverrides> | void;
}
interface HttpInterceptorRequestError {
	fetchOptions: Readonly<HttpFetchOptionsWithPath>;
	error: Error;
}
interface HttpInterceptorResponseError extends HttpResponse {
	request: Readonly<Request>;
	error: Error | IHttpFetchError;
}
interface HttpRequestInit {
	/**
	 * A BodyInit object or null to set request's body.
	 */
	body?: BodyInit | null;
	/**
	 * The cache mode associated with request, which is a string indicating how the request will interact with the
	 * browser's cache when fetching.
	 */
	cache?: RequestCache;
	/**
	 * The credentials mode associated with request, which is a string indicating whether credentials will be sent with
	 * the request always, never, or only when sent to a same-origin URL.
	 */
	credentials?: RequestCredentials;
	/** {@link HttpHeadersInit} */
	headers?: HttpHeadersInit;
	/**
	 * Subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of
	 * multiple hashes separated by whitespace.
	 */
	integrity?: string;
	/** Whether or not request can outlive the global in which it was created. */
	keepalive?: boolean;
	/** HTTP method, which is "GET" by default. */
	method?: string;
	/**
	 * The mode associated with request, which is a string indicating whether the request will use CORS, or will be
	 * restricted to same-origin URLs.
	 */
	mode?: RequestMode;
	/**
	 * The redirect mode associated with request, which is a string indicating how redirects for the request will be
	 * handled during fetching. A request will follow redirects by default.
	 */
	redirect?: RequestRedirect;
	/**
	 * The referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to
	 * indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to
	 * determine the value of the `Referer` header of the request being made.
	 */
	referrer?: string;
	/**
	 * The referrer policy associated with request. This is used during fetching to compute the value of the request's
	 * referrer.
	 */
	referrerPolicy?: ReferrerPolicy;
	/**
	 * Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has
	 * been aborted, and its abort event handler.
	 */
	signal?: AbortSignal | null;
	/**
	 * Can only be null. Used to disassociate request from any Window.
	 */
	window?: null;
}
interface HttpResponse<TResponseBody = unknown> {
	/** The original {@link HttpFetchOptionsWithPath} used to send this request. */
	readonly fetchOptions: Readonly<HttpFetchOptionsWithPath>;
	/** Raw request sent to Kibana server. */
	readonly request: Readonly<Request>;
	/** Raw response received, may be undefined if there was an error. */
	readonly response?: Readonly<Response>;
	/** Parsed body received, may be undefined if there was an error. */
	readonly body?: TResponseBody;
}
interface HttpSetup {
	/**
	 * APIs for manipulating the basePath on URL segments.
	 * See {@link IBasePath}
	 */
	basePath: IBasePath;
	/**
	 * APIs for creating hrefs to static assets.
	 * See {@link IStaticAssets}
	 */
	staticAssets: IStaticAssets;
	/**
	 * APIs for denoting certain paths for not requiring authentication
	 */
	anonymousPaths: IAnonymousPaths;
	externalUrl: IExternalUrl;
	/**
	 * Adds a new {@link HttpInterceptor} to the global HTTP client.
	 * @param interceptor a {@link HttpInterceptor}
	 * @returns a function for removing the attached interceptor.
	 */
	intercept(interceptor: HttpInterceptor): () => void;
	/** Makes an HTTP request. Defaults to a GET request unless overridden. See {@link HttpHandler} for options. */
	fetch: HttpHandler;
	/** Makes an HTTP request with the DELETE method. See {@link HttpHandler} for options. */
	delete: HttpHandler;
	/** Makes an HTTP request with the GET method. See {@link HttpHandler} for options. */
	get: HttpHandler;
	/** Makes an HTTP request with the HEAD method. See {@link HttpHandler} for options. */
	head: HttpHandler;
	/** Makes an HTTP request with the OPTIONS method. See {@link HttpHandler} for options. */
	options: HttpHandler;
	/** Makes an HTTP request with the PATCH method. See {@link HttpHandler} for options. */
	patch: HttpHandler;
	/** Makes an HTTP request with the POST method. See {@link HttpHandler} for options. */
	post: HttpHandler;
	/** Makes an HTTP request with the PUT method. See {@link HttpHandler} for options. */
	put: HttpHandler;
	/**
	 * Adds a new source of loading counts. Used to show the global loading indicator when sum of all observed counts are
	 * more than 0.
	 * @param countSource$ an Observable to subscribe to for loading count updates.
	 */
	addLoadingCountSource(countSource$: Observable<number>): void;
	/**
	 * Get the sum of all loading count sources as a single Observable.
	 */
	getLoadingCount$(): Observable<number>;
}
interface I18nStart {
	/**
	 * React Context provider required as the topmost component for any i18n-compatible React tree.
	 */
	Context: ({ children }: {
		children: React$1.ReactNode;
	}) => JSX.Element;
}
interface IAnonymousPaths {
	/**
	 * Determines whether the provided path doesn't require authentication. `path` should include the current basePath.
	 */
	isAnonymous(path: string): boolean;
	/**
	 * Register `path` as not requiring authentication. `path` should not include the current basePath.
	 */
	register(path: string): void;
}
interface IBasePath {
	/**
	 * Gets the `basePath` string.
	 */
	get: () => string;
	/**
	 * Prepends `path` with the basePath.
	 */
	prepend: (url: string) => string;
	/**
	 * Removes the prepended basePath from the `path`.
	 */
	remove: (url: string) => string;
	/**
	 * Returns the server's root basePath as configured, without any namespace prefix.
	 *
	 * See {@link BasePath.get} for getting the basePath value for a specific request
	 */
	readonly serverBasePath: string;
	/**
	 * Href (hypertext reference) intended to be used as the base for constructing
	 * other hrefs to static assets.
	 */
	readonly assetsHrefBase: string;
	/**
	 * The server's publicly exposed base URL, if configured. Includes protocol, host, port (optional) and the
	 * {@link IBasePath.serverBasePath}.
	 *
	 * @remarks
	 * Should be used for generating external URL links back to this Kibana instance.
	 */
	readonly publicBaseUrl?: string;
}
interface IExpressionLoaderParams {
	searchContext?: ExecutionContextSearch;
	context?: ExpressionValue;
	variables?: Record<string, unknown>;
	debug?: boolean;
	customFunctions?: [
	];
	customRenderers?: [
	];
	uiState?: unknown;
	inspectorAdapters?: Adapters;
	interactive?: boolean;
	onRenderError?: RenderErrorHandlerFnType;
	searchSessionId?: string;
	renderMode?: RenderMode;
	syncColors?: boolean;
	syncCursor?: boolean;
	syncTooltips?: boolean;
	hasCompatibleActions?: ExpressionRenderHandlerParams["hasCompatibleActions"];
	getCompatibleCellValueActions?: ExpressionRenderHandlerParams["getCompatibleCellValueActions"];
	executionContext?: KibanaExecutionContext;
	abortController?: AbortController;
	/**
	 * The flag to toggle on emitting partial results.
	 * By default, the partial results are disabled.
	 */
	partial?: boolean;
	/**
	 * Throttling of partial results in milliseconds. 0 is disabling the throttling.
	 * By default, it equals 1000.
	 */
	throttle?: number;
	allowCache?: boolean;
}
interface IExternalUrl {
	/**
	 * Determines if the provided URL is an internal url.
	 *
	 * @param relativeOrAbsoluteUrl
	 */
	isInternalUrl(relativeOrAbsoluteUrl: string): boolean;
	/**
	 * Determines if the provided URL is a valid location to send users.
	 * Validation is based on the configured allow list in kibana.yml.
	 *
	 * If the URL is valid, then a URL will be returned.
	 * Otherwise, this will return null.
	 *
	 * @param relativeOrAbsoluteUrl
	 */
	validateUrl(relativeOrAbsoluteUrl: string): URL | null;
}
interface IHttpFetchError<TResponseBody = unknown> extends Error {
	readonly name: string;
	readonly request: Request;
	readonly response?: Response;
	readonly body?: TResponseBody;
}
interface IHttpInterceptController {
	/** Whether or not this chain has been halted. */
	halted: boolean;
	/** Halt the request Promise chain and do not process further interceptors or response handlers. */
	halt(): void;
}
interface IHttpResponseInterceptorOverrides<TResponseBody = unknown> {
	/** Raw response received, may be undefined if there was an error. */
	readonly response?: Readonly<Response>;
	/** Parsed body received, may be undefined if there was an error. */
	readonly body?: TResponseBody;
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
}
interface IToasts {
	get$: () => Observable<Toast[]>;
	add: (toastOrTitle: ToastInput) => Toast;
	remove: (toastOrId: Toast | string) => void;
	addInfo: (toastOrTitle: ToastInput, options?: any) => Toast;
	addSuccess: (toastOrTitle: ToastInput, options?: any) => Toast;
	addWarning: (toastOrTitle: ToastInput, options?: any) => Toast;
	addDanger: (toastOrTitle: ToastInput, options?: any) => Toast;
	addError: (error: Error, options: ErrorToastOptions) => Toast;
}
interface IUiSettingsClient {
	/**
	 * Gets the value for a specific uiSetting. If this setting has no user-defined value
	 * then the `defaultOverride` parameter is returned (and parsed if setting is of type
	 * "json" or "number). If the parameter is not defined and the key is not registered
	 * by any plugin then an error is thrown, otherwise reads the default value defined by a plugin.
	 */
	get: <T = any>(key: string, defaultOverride?: T) => T;
	/**
	 * Gets an observable of the current value for a config key, and all updates to that config
	 * key in the future. Providing a `defaultOverride` argument behaves the same as it does in #get()
	 */
	get$: <T = any>(key: string, defaultOverride?: T) => Observable<T>;
	/**
	 * Gets the metadata about all uiSettings, including the type, default value, and user value
	 * for each key.
	 */
	getAll: () => Readonly<Record<string, PublicUiSettingsParams & UserProvidedValues>>;
	/**
	 * Sets the value for a uiSetting. If the setting is not registered by any plugin
	 * it will be stored as a custom setting. The new value will be synchronously available via
	 * the `get()` method and sent to the server in the background. If the request to the
	 * server fails then a updateErrors$ will be notified and the setting will be
	 * reverted to its value before `set()` was called.
	 */
	set: (key: string, value: any) => Promise<boolean>;
	/**
	 * Removes the user-defined value for a setting, causing it to revert to the default. This
	 * method behaves the same as calling `set(key, null)`, including the synchronization, custom
	 * setting, and error behavior of that method.
	 */
	remove: (key: string) => Promise<boolean>;
	/**
	 * Returns true if the key is a "known" uiSetting, meaning it is either registered
	 * by any plugin or was previously added as a custom setting via the `set()` method.
	 */
	isDeclared: (key: string) => boolean;
	/**
	 * Returns true if the setting has no user-defined value or is unknown
	 */
	isDefault: (key: string) => boolean;
	/**
	 * Returns true if the setting wasn't registered by any plugin, but was either
	 * added directly via `set()`, or is an unknown setting found in the uiSettings saved
	 * object
	 */
	isCustom: (key: string) => boolean;
	/**
	 * Shows whether the uiSettings value set by the user.
	 */
	isOverridden: (key: string) => boolean;
	/**
	 * Returns an Observable that notifies subscribers of each update to the uiSettings,
	 * including the key, newValue, and oldValue of the setting that changed.
	 */
	getUpdate$: <T = any>() => Observable<{
		key: string;
		newValue: T;
		oldValue: T;
	}>;
	/**
	 * Returns an Observable that notifies subscribers of each error while trying to update
	 * the settings, containing the actual Error class.
	 */
	getUpdateErrors$: () => Observable<Error>;
	/**
	 * Validates a uiSettings value and returns a ValueValidation object.
	 */
	validateValue: (key: string, value: any) => Promise<ValueValidation>;
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
interface Labels {
	[key: string]: LabelValue;
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
interface LoggerFactory {
	/**
	 * Returns a `Logger` instance for the specified context.
	 *
	 * @param contextParts - Parts of the context to return logger for. For example
	 * get('plugins', 'pid') will return a logger for the `plugins.pid` context.
	 */
	get(...contextParts: string[]): Logger;
}
interface MatchAllFilterMeta extends FilterMeta, SerializableRecord {
	field: string;
	formattedValue: string;
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
interface NavigateToAppOptions {
	/**
	 * optional {@link App.deepLinks | deep link} id inside the application to navigate to.
	 * If an additional {@link NavigateToAppOptions.path | path} is defined it will be appended to the deep link path.
	 */
	deepLinkId?: string;
	/**
	 * optional path inside application to deep link to.
	 * If undefined, will use {@link App.defaultPath | the app's default path} as default.
	 */
	path?: string;
	/**
	 * optional state to forward to the application
	 */
	state?: unknown;
	/**
	 * if true, will not create a new history entry when navigating (using `replace` instead of `push`)
	 */
	replace?: boolean;
	/**
	 * if true, will open the app in new tab, will share session information via window.open if base
	 */
	openInNewTab?: boolean;
	/**
	 * if true, will bypass the default onAppLeave behavior
	 */
	skipAppLeave?: boolean;
}
interface NavigateToUrlOptions {
	/**
	 * if true, will bypass the default onAppLeave behavior
	 */
	skipAppLeave?: boolean;
	/**
	 * if true will force a full page reload/refresh/assign, overriding the outcome of other url checks against current the location (effectively using `window.location.assign` instead of `push`)
	 */
	forceRedirect?: boolean;
	/**
	 * optional state to forward to the application
	 */
	state?: unknown;
}
interface NotFoundPluginContractResolverResponseItem {
	found: false;
}
interface NotificationCoordinatorPublicApi {
	/**
	 * Method that opts in a some observable to the notification coordination.
	 */
	optInToCoordination: <T extends Array<{
		id: string;
	}>>($: Observable<T>, cond: (coordinatorState: NotificationCoordinatorState) => boolean) => Observable<T>;
	/**
	 * Acquires a lock for the registrar bounded to this method.
	 */
	acquireLock: () => void;
	/**
	 * Releases the lock for the registrar bounded to this method.
	 */
	releaseLock: () => void;
	/**
	 * Observable that emits the current state of the notification coordinator.
	 */
	lock$: Observable<NotificationCoordinatorState>;
}
interface NotificationCoordinatorState {
	locked: boolean;
	controller: string | null;
}
interface NotificationsSetup {
	/** {@link ToastsSetup} */
	toasts: ToastsSetup;
	/**
	 * {@link NotificationCoordinator}
	 */
	coordinator: NotificationCoordinator;
}
interface NotificationsStart {
	/** {@link ToastsStart} */
	toasts: ToastsStart;
	showErrorDialog: (options: {
		title: string;
		error: Error;
	}) => void;
}
interface ObservableLike<T> {
	subscribe(observer: (value: T) => void): void;
}
interface OverlayBannersStart {
	/**
	 * Add a new banner
	 *
	 * @param mount {@link MountPoint}
	 * @param priority optional priority order to display this banner. Higher priority values are shown first.
	 * @returns a unique identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
	 *          {@link OverlayBannersStart.replace}
	 */
	add(mount: MountPoint, priority?: number): string;
	/**
	 * Remove a banner
	 *
	 * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
	 * @returns if the banner was found or not
	 */
	remove(id: string): boolean;
	/**
	 * Replace a banner in place
	 *
	 * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
	 * @param mount {@link MountPoint}
	 * @param priority optional priority order to display this banner. Higher priority values are shown first.
	 * @returns a new identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
	 *          {@link OverlayBannersStart.replace}
	 */
	replace(id: string | undefined, mount: MountPoint, priority?: number): string;
	getComponent(): JSX.Element;
}
interface OverlayFlyoutStart {
	/**
	 * Opens a flyout panel with the given mount point inside. You can use
	 * `close()` on the returned FlyoutRef to close the flyout.
	 *
	 * @param mount {@link MountPoint} - Mounts the children inside a flyout panel
	 * @param options {@link OverlayFlyoutOpenOptions} - options for the flyout
	 * @return {@link OverlayRef} A reference to the opened flyout panel.
	 */
	open(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
}
interface OverlayModalConfirmOptions {
	title?: string;
	cancelButtonText?: string;
	confirmButtonText?: string;
	className?: string;
	closeButtonAriaLabel?: string;
	"data-test-subj"?: string;
	defaultFocusedButton?: EuiConfirmModalProps["defaultFocusedButton"];
	buttonColor?: EuiConfirmModalProps["buttonColor"];
	"aria-labelledby"?: EuiConfirmModalProps["aria-labelledby"];
	/**
	 * Sets the max-width of the modal.
	 * Set to `true` to use the default (`euiBreakpoints 'm'`),
	 * set to `false` to not restrict the width,
	 * set to a number for a custom width in px,
	 * set to a string for a custom width in custom measurement.
	 */
	maxWidth?: boolean | number | string;
}
interface OverlayModalOpenOptions {
	className?: string;
	closeButtonAriaLabel?: string;
	"data-test-subj"?: string;
	maxWidth?: boolean | number | string;
	"aria-labelledby"?: EuiModalProps["aria-labelledby"];
}
interface OverlayModalStart {
	/**
	 * Opens a modal panel with the given mount point inside. You can use
	 * `close()` on the returned OverlayRef to close the modal.
	 *
	 * @param mount {@link MountPoint} - Mounts the children inside the modal
	 * @param options {@link OverlayModalOpenOptions} - options for the modal
	 * @return {@link OverlayRef} A reference to the opened modal.
	 */
	open(mount: MountPoint, options?: OverlayModalOpenOptions): OverlayRef;
	/**
	 * Opens a confirmation modal with the given text or mountpoint as a message.
	 * Returns a Promise resolving to `true` if user confirmed or `false` otherwise.
	 *
	 * @param message {@link MountPoint} - string or mountpoint to be used a the confirm message body
	 * @param options {@link OverlayModalConfirmOptions} - options for the confirm modal
	 */
	openConfirm(message: MountPoint | string, options?: OverlayModalConfirmOptions): Promise<boolean>;
}
interface OverlayRef {
	/**
	 * A Promise that will resolve once this overlay is closed.
	 *
	 * Overlays can close from user interaction, calling `close()` on the overlay
	 * reference or another overlay replacing yours via `openModal` or `openFlyout`.
	 */
	onClose: Promise<void>;
	/**
	 * Closes the referenced overlay if it's still open which in turn will
	 * resolve the `onClose` Promise. If the overlay had already been
	 * closed this method does nothing.
	 */
	close(): Promise<void>;
}
interface OverlayStart {
	/** {@link OverlayBannersStart} */
	banners: OverlayBannersStart;
	/** {@link OverlayFlyoutStart#open} */
	openFlyout: OverlayFlyoutStart["open"];
	/** {@link OverlayModalStart#open} */
	openModal: OverlayModalStart["open"];
	/** {@link OverlayModalStart#openConfirm} */
	openConfirm: OverlayModalStart["openConfirm"];
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
interface Plugin$1<TSetup = void, TStart = void, TPluginsSetup extends Record<string, any> = never, TPluginsStart extends Record<string, any> = never> {
	setup(core: CoreSetup<TPluginsStart, TStart>, plugins: TPluginsSetup): TSetup;
	start(core: CoreStart, plugins: TPluginsStart): TStart;
	stop?(): MaybePromise<void>;
}
interface PluginInitializerContext<ConfigSchema extends object = object> {
	/**
	 * A symbol used to identify this plugin in the system. Needed when registering handlers or context providers.
	 */
	readonly opaqueId: PluginOpaqueId;
	readonly env: {
		mode: Readonly<EnvironmentMode>;
		packageInfo: Readonly<PackageInfo>;
	};
	readonly logger: LoggerFactory;
	readonly config: {
		get: <T extends object = ConfigSchema>() => T;
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
	 *         resolved once all plugins are setup, and before Core's `start` is initiated.
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
	 * ```
	 *
	 * @experimental
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
interface PricingProductObservability {
	type: "observability";
	tier: "complete" | "logs_essentials";
}
interface PricingProductSecurity {
	type: "security";
	tier: "search_ai_lake" | "complete" | "essentials";
	product_lines: Array<"ai_soc" | "endpoint" | "cloud">;
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
interface ReactExpressionRendererProps extends Omit<ExpressionRendererParams, "hasCustomErrorRenderer"> {
	className?: string;
	dataAttrs?: string[];
	renderError?: (message?: string | null, error?: ExpressionRenderError | null) => React$1.ReactElement | React$1.ReactElement[];
	padding?: "xs" | "s" | "m" | "l" | "xl";
}
interface RecursiveReadonlyArray<T> extends ReadonlyArray<RecursiveReadonly<T>> {
}
interface RemovalApiDeprecationType {
	/**
	 * remove deprecation reason denotes the API was fully removed with no replacement
	 */
	type: "remove";
}
interface RenderingService {
	addContext: (element: React$1.ReactNode) => React$1.ReactElement;
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
interface Response$1 {
	json?: object;
	requestParams?: ConnectionRequestParams;
	time?: number;
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
interface SavedObjectReference {
	name: string;
	type: string;
	id: string;
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
interface ScopedHistory<HistoryLocationState = unknown> extends History$1<HistoryLocationState> {
	/**
	 * Creates a `ScopedHistory` for a subpath of this `ScopedHistory`. Useful for applications that may have sub-apps
	 * that do not need access to the containing application's history.
	 *
	 * @param basePath the URL path scope for the sub history
	 */
	createSubHistory(basePath: string): ScopedHistory;
	/**
	 * Creates an href (string) to the location.
	 * If `prependBasePath` is true (default), it will prepend the location's path with the scoped history basePath.
	 *
	 * @param location
	 * @param options.prependBasePath
	 */
	createHref(location: LocationDescriptorObject<HistoryLocationState>, options?: {
		prependBasePath?: boolean;
	}): Href;
}
interface SecurityServiceSetup {
	/**
	 * Register the security implementation that then will be used and re-exposed by Core.
	 *
	 * @remark this should **exclusively** be used by the security plugin.
	 */
	registerSecurityDelegate(api: CoreSecurityDelegateContract): void;
}
interface SecurityServiceStart {
	/**
	 * The {@link CoreAuthenticationService | authentication service}
	 */
	authc: CoreAuthenticationService;
}
interface SerializableArray extends Array<Serializable> {
}
interface SerializableRecord extends Record<string, Serializable> {
}
interface SettingsStart {
	client: IUiSettingsClient;
	globalClient: IUiSettingsClient;
}
interface StateContainer<State extends BaseState, PureTransitions extends object = object, PureSelectors extends object = {}> extends BaseStateContainer<State> {
	transitions: Readonly<PureTransitionsToTransitions<PureTransitions>>;
	selectors: Readonly<PureSelectorsToSelectors<PureSelectors>>;
}
interface ThemeServiceSetup {
	/**
	 * An observable of the currently active theme.
	 * Note that the observable has a replay effect, so it will emit once during subscriptions.
	 */
	theme$: Observable<CoreTheme>;
	/**
	 * Returns the theme currently in use.
	 * Note that when possible, using the `theme$` observable instead is strongly encouraged, as
	 * it will allow to react to dynamic theme switch (even if those are not implemented at the moment)
	 */
	getTheme(): CoreTheme;
}
interface ToastOptions {
	/**
	 * How long should the toast remain on screen.
	 */
	toastLifeTimeMs?: number;
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
	 * By default, get API returns user information, but does not return any user data. The optional "dataPath"
	 * parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	dataPath: string;
}
interface UserProfileService {
	/**
	 * Retrieve an observable emitting the current user profile data.
	 */
	getUserProfile$(): Observable<UserProfileData | null>;
	/** Flag to indicate if the current user has a user profile. Anonymous users don't have user profiles. */
	getEnabled$(): Observable<boolean>;
	/**
	 * Retrieves the user profile of the current user. If the profile isn't available, e.g. for the anonymous users or
	 * users authenticated via authenticating proxies, the `null` value is returned.
	 * @param [params] Get current user profile operation parameters.
	 * @param params.dataPath By default `getCurrent()` returns user information, but does not return any user data. The
	 * optional "dataPath" parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	getCurrent<D extends UserProfileData>(params?: UserProfileGetCurrentParams): Promise<GetUserProfileResponse<D>>;
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
	 *
	 * Note: This endpoint is not provided out-of-the-box by the platform. You need to expose your own
	 * version within your app. An example of how to do this can be found in:
	 * `examples/user_profile_examples/server/plugin.ts`
	 *
	 * @param path Path to your app's suggest endpoint.
	 * @param params Suggest operation parameters.
	 * @param params.name Query string used to match name-related fields in user profiles. The
	 * following fields are treated as name-related: username, full_name and email.
	 * @param params.size Desired number of suggestions to return. The default value is 10.
	 * @param params.dataPath By default, suggest API returns user information, but does not return
	 * any user data. The optional "dataPath" parameter can be used to return personal data for this
	 * user (within `kibana` namespace only).
	 */
	suggest<D extends UserProfileData>(path: string, params: UserProfileSuggestParams): Promise<Array<UserProfile<D>>>;
	/**
	 * Updates user profile data of the current user.
	 * @param data Application data to be written (merged with existing data).
	 */
	update<D extends UserProfileData>(data: D): Promise<void>;
	/**
	 * Partially updates user profile data of the current user, merging the previous data with the provided data.
	 * @param data Application data to be merged with existing data.
	 */
	partialUpdate<D extends Partial<UserProfileData>>(data: D): Promise<void>;
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
	name: string;
	/**
	 * Desired number of suggestions to return. The default value is 10.
	 */
	size?: number;
	/**
	 * By default, suggest API returns user information, but does not return any user data. The optional "dataPath"
	 * parameter can be used to return personal data for this user (within `kibana` namespace only).
	 */
	dataPath?: string;
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
interface ValueValidation {
	successfulValidation: boolean;
	valid?: boolean;
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
interface VersionedState<S extends Serializable = Serializable> {
	version: string;
	state: S;
}
type AgentBuilderApp = typeof AGENT_BUILDER_APP_ID;
type AgentBuilderLinkId = "conversations" | "tools" | "agents" | "agents_create";
type AiAssistantApp = typeof AI_ASSISTANT_APP_ID;
type AllRequiredCondition = Array<Privilege | {
	anyOf: Privilege[];
}>;
type AnalyticsServiceSetup = Omit<AnalyticsClient, "flush" | "shutdown">;
type AnalyticsServiceStart = Pick<AnalyticsClient, "optIn" | "reportEvent" | "telemetryCounter$">;
type AnyExpressionFunctionDefinition = ExpressionFunctionDefinition<string, any, Record<string, any>, any>;
type AnyExpressionRenderDefinition = ExpressionRenderDefinition<any>;
type AnyExpressionTypeDefinition = ExpressionTypeDefinition<string, any, any>;
type AnyRequiredCondition = Array<Privilege | {
	allOf: Privilege[];
}>;
type ApiVersion = string;
type ApmApp = typeof APM_APP_ID;
type ApmLinkId = "services" | "traces" | "service-groups-list" | "service-map" | "dependencies" | "settings" | "storage-explorer";
type AppDeepLink<Id extends string = string> = {
	/** Identifier to represent this sublink, should be unique for this application */
	id: Id;
	/** Title to label represent this deep link */
	title: string;
	/** Optional keywords to match with in deep links search. Omit if this part of the hierarchy does not have a page URL. */
	keywords?: string[];
	/**
	 * Optional list of locations where the deepLink is visible. By default the deepLink is visible in "globalSearch".
	 */
	visibleIn?: AppDeepLinkLocations[];
	/**
	 * Optional category to use instead of the parent app category.
	 * This property is added to customize the way a deep link is rendered in the global search.
	 * Any other feature that consumes the deep links (navigation tree, etc.) will not be affected by this addition.
	 */
	category?: AppCategory;
} & AppNavOptions & ({
	/** URL path to access this link, relative to the application's appRoute. */
	path: string;
	/** Optional array of links that are 'underneath' this section in the hierarchy */
	deepLinks?: Array<AppDeepLink<Id>>;
} | {
	/** Optional path to access this section. Omit if this part of the hierarchy does not have a page URL. */
	path?: string;
	/** Array links that are 'underneath' this section in this hierarchy. */
	deepLinks: Array<AppDeepLink<Id>>;
});
type AppDeepLinkId = DeepLinkId$1 | DeepLinkId | DeepLinkId$2 | DeepLinkId$3 | DeepLinkId$4 | DeepLinkId$5 | DeepLinkId$6 | DeepLinkId$7 | DeepLinkId$8 | DeepLinkId$9 | DeepLinkId$10 | DeepLinkId$11 | DeepLinkId$12;
type AppDeepLinkLocations = "globalSearch" | "sideNav" | "home" | "kibanaOverview";
type AppId = typeof DEV_TOOLS_APP_ID;
type AppId$1 = typeof DISCOVER_APP_ID | typeof DASHBOARD_APP_ID | typeof VISUALIZE_APP_ID | typeof MAPS_APP_ID | typeof CANVAS_APP_ID | typeof GRAPH_APP_ID;
type AppId$2 = typeof ML_APP_ID;
type AppId$3 = MonitoringAppId | IntegrationsAppId | ManagementAppId;
type AppId$4 = LogsApp | ObservabilityLogsExplorerApp | LastUsedLogsViewerApp | ObservabilityOverviewApp | ObservabilityOnboardingApp | ApmApp | MetricsApp | SyntheticsApp | UptimeApp | SloApp | AiAssistantApp | ObltUxApp | ObltProfilingApp | InventoryApp | StreamsApp;
type AppId$5 = typeof SECURITY_APP_ID;
type AppId$6 = typeof FLEET_APP_ID$1;
type AppId$7 = typeof HOME_APP_ID;
type AppId$8 = typeof WORKFLOWS_APP_ID;
type AppLeaveAction = AppLeaveDefaultAction | AppLeaveConfirmAction;
type AppLeaveHandler = (factory: AppLeaveActionFactory, nextAppId?: string) => AppLeaveAction;
type AppMount<HistoryLocationState = unknown> = (params: AppMountParameters<HistoryLocationState>) => AppUnmount | Promise<AppUnmount>;
type AppUnmount = () => void;
type AppUpdatableFields = Pick<App, "status" | "visibleIn" | "tooltip" | "defaultPath" | "deepLinks">;
type AppUpdater = (app: App) => Partial<AppUpdatableFields> | undefined;
type ApplicationsLinkId = "searchApplications";
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
type AuthenticationServiceContract = CoreAuthenticationService;
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
type ChromeHelpExtensionLinkBase = Pick<EuiButtonEmptyProps, "iconType" | "target" | "rel" | "data-test-subj">;
type ChromeHelpExtensionMenuLink = ChromeHelpExtensionMenuGitHubLink | ChromeHelpExtensionMenuDiscussLink | ChromeHelpExtensionMenuDocumentationLink | ChromeHelpExtensionMenuCustomLink;
type ChromeStyle = "classic" | "project";
type CloudConnectDeepLinkId = typeof CLOUD_CONNECT_NAV_ID;
type ConnectorsId = typeof SERVERLESS_ES_CONNECTORS_ID;
type ContentLinkId = "connectors" | "webCrawlers";
type CoreUserProfileDelegateContract = Omit<UserProfileService, "getUserProfile$" | "getEnabled$"> & {
	userProfile$: Observable<UserProfileData | null>;
	enabled$: Observable<boolean>;
};
type DataConnectorsApp = typeof DATA_CONNECTORS_APP_ID;
type DatatableColumnType = "_source" | "attachment" | "boolean" | "date" | "geo_point" | "geo_shape" | "ip" | "murmur3" | "number" | "string" | "unknown" | "conflict" | "object" | "nested" | "histogram" | "null";
type DatatableRow = Record<string, any>;
type DeepLinkId = AppId | `${AppId}:${LinkId}`;
type DeepLinkId$1 = AppId$1;
type DeepLinkId$10 = AgentBuilderApp | `${AgentBuilderApp}:${AgentBuilderLinkId}`;
type DeepLinkId$11 = DataConnectorsApp;
type DeepLinkId$12 = AppId$8 | `${AppId$8}:${LinkId$4}`;
type DeepLinkId$2 = AppId$2 | `${AppId$2}:${LinkId$1}`;
type DeepLinkId$3 = AppId$3 | MonitoringDeepLinkId | IntegrationsDeepLinkId | CloudConnectDeepLinkId | ManagementDeepLinkId;
type DeepLinkId$4 = EnterpriseSearchApp | EnterpriseSearchContentApp | EnterpriseSearchApplicationsApp | EnterpriseSearchAnalyticsApp | ConnectorsId | ServerlessWebCrawlers | SearchPlaygroundId | SearchInferenceEndpointsId | SearchSynonymsId | SearchQueryRulesId | SearchHomepage | `${EnterpriseSearchContentApp}:${ContentLinkId}` | `${EnterpriseSearchApplicationsApp}:${ApplicationsLinkId}` | `${SearchInferenceEndpointsId}:${SearchInferenceEndpointsLinkId}` | `${SearchSynonymsId}:${SynonymsLinkId}` | SearchIndices | SearchIndexManagement | SearchGettingStarted | `${SearchIndices}:${SearchIndicesLinkId}`;
type DeepLinkId$5 = AppId$4 | `${LogsApp}:${LogsLinkId}` | `${ObservabilityOverviewApp}:${ObservabilityOverviewLinkId}` | `${MetricsApp}:${MetricsLinkId}` | `${ApmApp}:${ApmLinkId}` | `${SyntheticsApp}:${SyntheticsLinkId}` | `${UptimeApp}:${UptimeLinkId}` | `${ObltProfilingApp}:${ProfilingLinkId}` | `${InventoryApp}:${InventoryLinkId}` | `${StreamsApp}:${StreamsLinkId}`;
type DeepLinkId$6 = AppId$5 | `${AppId$5}:${LinkId$2}`;
type DeepLinkId$7 = AppId$6 | `${AppId$6}:${LinkId$3}`;
type DeepLinkId$8 = AppId$7;
type DeepLinkId$9 = WorkplaceAIApp;
type DeepPartial<T> = T extends any[] ? DeepPartialArray<T[number]> : T extends object ? DeepPartialObject<T> : T;
type DeepPartialObject<T> = {
	[P in keyof T]+?: DeepPartial<T[P]>;
};
type DeprecationsDetails = ConfigDeprecationDetails | ApiDeprecationDetails | FeatureDeprecationDetails;
type DestructiveRouteMethod = "post" | "put" | "delete" | "patch";
type DomainDeprecationDetails<ExtendedDetails = DeprecationsDetails> = ExtendedDetails & {
	domainId: string;
};
type DurationValueType = Duration | string | number;
type Ensure<T, X> = T extends X ? T : never;
type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;
type EnterpriseSearchAnalyticsApp = typeof ENTERPRISE_SEARCH_ANALYTICS_APP_ID;
type EnterpriseSearchApp = typeof ENTERPRISE_SEARCH_APP_ID;
type EnterpriseSearchApplicationsApp = typeof ENTERPRISE_SEARCH_APPLICATIONS_APP_ID;
type EnterpriseSearchContentApp = typeof ENTERPRISE_SEARCH_CONTENT_APP_ID;
type ErrorLike = SerializedError & {
	original?: SerializedError;
};
type EvaluationContext = MultiContextEvaluationContext | SingleContextEvaluationContext;
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
type ExpressionRendererEvent = IInterpreterRenderEvent<any>;
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
type FatalErrorsStart = FatalErrorsSetup;
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
type FleetAppId = typeof FLEET_APP_ID;
type GetMigrationFunctionObjectFn = () => MigrateFunctionsObject;
type Headers$1 = {
	[header in KnownHeaders]?: string | string[] | undefined;
} & {
	[header: string]: string | string[] | undefined;
};
type HttpProtocol = "http1" | "http2";
type HttpStart = HttpSetup;
type IExpressionLoader = (element: HTMLElement, expression?: string | ExpressionAstExpression, params?: IExpressionLoaderParams) => Promise<ExpressionLoader>;
type IExpressionRenderer = (element: HTMLElement, data: unknown, options?: ExpressionRenderHandlerParams) => Promise<ExpressionRenderHandler>;
type IntegrationsAppId = typeof INTEGRATIONS_APP_ID;
type IntegrationsDeepLinkId = IntegrationsAppId | FleetAppId | OsQueryAppId;
type InventoryApp = typeof INVENTORY_APP_ID;
type InventoryLinkId = "datastreams";
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
type KibanaProject = (typeof KIBANA_PROJECTS)[number];
type KibanaRequestRouteOptions<Method extends RouteMethod> = (Method extends "get" | "options" ? Required<Omit<RouteConfigOptions<Method>, "body">> : Required<RouteConfigOptions<Method>>) & {
	security?: RouteSecurity;
};
type KnownHeaders = KnownKeys<IncomingHttpHeaders>;
type KnownKeys<T> = StringKeysAsVals<T> extends {
	[_ in keyof T]: infer U;
} ? U : never;
type KnownTypeToString<T> = T extends string ? "string" : T extends boolean ? "boolean" : T extends number ? "number" : T extends null ? "null" : T extends {
	type: string;
} ? T["type"] : never;
type LabelValue = string | number | boolean;
type LastUsedLogsViewerApp = typeof LAST_USED_LOGS_VIEWER_APP_ID;
type LinkId = "searchprofiler" | "painless_lab" | "grokdebugger" | "console";
type LinkId$1 = "overview" | "anomalyDetection" | "anomalyExplorer" | "singleMetricViewer" | "dataDrift" | "dataFrameAnalytics" | "resultExplorer" | "analyticsMap" | "aiOps" | "logRateAnalysis" | "logPatternAnalysis" | "changePointDetections" | "modelManagement" | "nodesOverview" | "nodes" | "memoryUsage" | "esqlDataVisualizer" | "dataVisualizer" | "fileUpload" | "indexDataVisualizer" | "settings" | "calendarSettings" | "calendarSettings" | "filterListsSettings" | "notifications" | "suppliedConfigurations";
type LinkId$2 = `${SecurityPageName}`;
type LinkId$3 = "agents" | "policies" | "enrollment_tokens" | "uninstall_tokens" | "data_streams" | "settings";
type LinkId$4 = `${WorkflowsPageName}`;
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
type LogsApp = typeof LOGS_APP_ID;
type LogsLinkId = "log-categories" | "settings" | "anomalies" | "stream";
type ManagementAppId = typeof MANAGEMENT_APP_ID;
type ManagementDeepLinkId = MonitoringAppId | `${ManagementAppId}:${ManagementId}`;
type ManagementId = "ad_settings" | "aiAssistantManagementSelection" | "analytics" | "anomaly_detection" | "securityAiAssistantManagement" | "observabilityAiAssistantManagement" | "api_keys" | "cases" | "cross_cluster_replication" | "dataViews" | "data_quality" | "data_usage" | "content_connectors" | "filesManagement" | "license_management" | "index_lifecycle_management" | "index_management" | "ingest_pipelines" | "jobsListLink" | "maintenanceWindows" | "migrate_data" | "objects" | "overview" | "pipelines" | "remote_clusters" | "reporting" | "role_mappings" | "roles" | "rollup_jobs" | "search_sessions" | "settings" | "snapshot_restore" | "spaces" | "supplied_configurations" | "tags" | "trained_models" | "transform" | "triggersActions" | "triggersActionsAlerts" | "triggersActionsConnectors" | "upgrade_assistant" | "users" | "watcher" | "genAiSettings";
type MaybePromise<T> = T | Promise<T>;
type MetricsApp = typeof METRICS_APP_ID;
type MetricsLinkId = "inventory" | "metrics-explorer" | "hosts" | "settings" | "assetDetails";
type MigrateFunction<FromVersion extends Serializable = SerializableRecord, ToVersion extends Serializable = SerializableRecord> = (state: FromVersion) => ToVersion;
type MigrateFunctionsObject = {
	[semver: string]: MigrateFunction<any, any>;
};
type MonitoringAppId = typeof MONITORING_APP_ID;
type MonitoringDeepLinkId = MonitoringAppId;
type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;
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
type NotificationCoordinator = (registrar: string) => NotificationCoordinatorPublicApi;
type ObltProfilingApp = typeof OBLT_PROFILING_APP_ID;
type ObltUxApp = typeof OBLT_UX_APP_ID;
type ObservabilityLogsExplorerApp = typeof OBSERVABILITY_LOGS_EXPLORER_APP_ID;
type ObservabilityOnboardingApp = typeof OBSERVABILITY_ONBOARDING_APP_ID;
type ObservabilityOverviewApp = typeof OBSERVABILITY_OVERVIEW_APP_ID;
type ObservabilityOverviewLinkId = "alerts" | "cases" | "cases_configure" | "cases_create" | "rules";
type OptionsForUnknowns = "allow" | "ignore" | "forbid";
type OsQueryAppId = typeof OSQUERY_APP_ID;
type OverlayFlyoutOpenOptions = Omit<EuiFlyoutProps | EuiFlyoutResizableProps, "onClose" | "onResize"> & {
	/**
	 * EuiFlyout onClose handler.
	 * If provided the consumer is responsible for calling flyout.close() to close the flyout;
	 */
	onClose?: (flyout: OverlayRef) => void;
	isResizable?: boolean;
};
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
type ProfilingLinkId = "stacktraces" | "flamegraphs" | "functions";
type ProjectRouting = string | undefined;
type PublicAppDeepLinkInfo = Omit<AppDeepLink, "deepLinks" | "keywords" | "visibleIn"> & {
	deepLinks: PublicAppDeepLinkInfo[];
	keywords: string[];
	visibleIn: AppDeepLinkLocations[];
};
type PublicAppInfo = Omit<App, "mount" | "updater$" | "keywords" | "deepLinks" | "visibleIn"> & {
	status: AppStatus;
	appRoute: string;
	keywords: string[];
	deepLinks: PublicAppDeepLinkInfo[];
	visibleIn: AppDeepLinkLocations[];
};
type PublicUiSettingsParams = Omit<UiSettingsParams, "schema">;
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
type RenderErrorHandlerFnType = (domNode: HTMLElement, error: ExpressionRenderError, handlers: IInterpreterRenderHandlers) => void;
type RenderMode = "edit" | "preview" | "view";
type ResolveDeprecationResponse = {
	status: "ok";
} | {
	status: "fail";
	reason: string;
};
type RouteAccess = "public" | "internal";
type RouteAuthc = AuthcEnabled | AuthcDisabled;
type RouteAuthz = AuthzEnabled | AuthzDisabled;
type RouteContentType = "application/json" | "application/*+json" | "application/octet-stream" | "application/x-www-form-urlencoded" | "multipart/form-data" | "text/*";
type RouteMethod = SafeRouteMethod | DestructiveRouteMethod;
type SafeRouteMethod = "get" | "options";
type SavedObjectReference$1 = SavedObjectReference;
type SearchGettingStarted = typeof SEARCH_GETTING_STARTED;
type SearchHomepage = typeof SEARCH_HOMEPAGE;
type SearchIndexManagement = typeof SEARCH_INDEX_MANAGEMENT;
type SearchIndices = typeof SEARCH_INDICES;
type SearchIndicesLinkId = typeof SEARCH_INDICES_CREATE_INDEX;
type SearchInferenceEndpointsId = typeof SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID;
type SearchInferenceEndpointsLinkId = "inferenceEndpoints";
type SearchPlaygroundId = typeof ES_SEARCH_PLAYGROUND_ID;
type SearchQueryRulesId = typeof SEARCH_QUERY_RULES_ID;
type SearchSynonymsId = typeof ES_SEARCH_SYNONYMS_ID;
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
type ServerlessWebCrawlers = typeof SERVERLESS_ES_WEB_CRAWLERS_ID;
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
type SloApp = typeof SLO_APP_ID;
type SolutionId = KibanaProject;
type StartServicesAccessor<TPluginsStart extends object = object, TStart = unknown> = () => Promise<[
	CoreStart,
	TPluginsStart,
	TStart
]>;
type StreamsApp = typeof STREAMS_APP_ID;
type StreamsLinkId = "overview";
type StringKeysAsVals<T> = {
	[K in keyof T]: string extends K ? never : number extends K ? never : K;
};
type SynonymsLinkId = "synonyms";
type SyntheticsApp = typeof SYNTHETICS_APP_ID;
type SyntheticsLinkId = "certificates" | "overview";
type TechnicalPreviewSettings = boolean | {
	/** Technical Preview message */
	message?: string;
	/** Key to documentation links */
	docLinksKey?: string;
};
type ThemeServiceStart = ThemeServiceSetup;
type TimeRange = {
	from: string;
	to: string;
	mode?: "absolute" | "relative";
};
type Toast = ToastInputFields & {
	id: string;
};
type ToastInput = string | ToastInputFields;
type ToastInputFields = Pick<EuiToast, Exclude<keyof EuiToast, "id" | "text" | "title">> & {
	title?: string | MountPoint;
	text?: string | MountPoint;
};
type ToastsSetup = IToasts;
type ToastsStart = IToasts;
type Transition<State extends BaseState, Args extends any[]> = (...args: Args) => State;
type TypeString<T> = KnownTypeToString<T extends ObservableLike<unknown> ? UnwrapObservable<T> : Awaited<T>>;
type TypeToString<T> = KnownTypeToString<T> | UnmappedTypeStrings;
type UiCounterMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT | string;
type UiSettingsScope = "namespace" | "global";
type UiSettingsSolutions = Array<SolutionId | "classic">;
type UiSettingsType = "undefined" | "json" | "markdown" | "number" | "select" | "boolean" | "string" | "array" | "image" | "color";
type UnmappedTypeStrings = "date" | "filter";
type UnmountCallback = () => void;
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
type UpdateValue = IInterpreterRenderUpdateParams<IExpressionLoaderParams>;
type UptimeApp = typeof UPTIME_APP_ID;
type UptimeLinkId = "Certificates";
type UserProfileData = Record<string, unknown>;
type UserProfileLabels = Record<string, string>;
type UserProfileServiceStart = UserProfileService;
type WorkplaceAIApp = typeof WORKPLACE_AI_APP_ID;

export {};
