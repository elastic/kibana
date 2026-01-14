/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/// <reference types="node" />
/// <reference types="react-router" />

import { AllowedSchemaBooleanTypes, AllowedSchemaNumberTypes, AllowedSchemaStringTypes, AllowedSchemaTypes, AnalyticsClient, AnalyticsClientInitContext, ContextProviderName, ContextProviderOpts, Event as Event$1, EventContext, EventType, EventTypeOpts, IShipper, OptInConfig, OptInConfigPerType, PossibleSchemaTypes, RegisterShipperOpts, RootSchema, SchemaArray, SchemaChildValue, SchemaMeta, SchemaMetaOptional, SchemaObject, SchemaValue, ShipperClassConstructor, ShipperName, TelemetryCounter, TelemetryCounterType } from '@elastic/ebt/client';
import { EcsAgent, EcsAs as EcsAutonomousSystem, EcsBase, EcsClient, EcsCloud, EcsContainer, EcsDestination, EcsDns, EcsError, EcsEvent, EcsFile, EcsGroup, EcsHost, EcsHttp, EcsLog, EcsNetwork, EcsObserver, EcsOrganization, EcsPackage, EcsProcess, EcsRegistry, EcsRelated, EcsRule, EcsServer, EcsService, EcsSource, EcsThreat, EcsTls, EcsTracing, EcsUrl, EcsUser, EcsUserAgent, EcsVulnerability } from '@elastic/ecs';
import { TransportRequestOptions, estypes } from '@elastic/elasticsearch';
import * as api from '@elastic/elasticsearch/lib/api/types';
import { AggregationsAggregationContainer, QueryDslQueryContainer, SearchResponse, SortOrder, SortResults } from '@elastic/elasticsearch/lib/api/types';
import { CommonProps, EuiBreadcrumb, EuiButtonColor, EuiButtonEmptyProps, EuiCodeProps, EuiConfirmModalProps, EuiContextMenuPanelDescriptor, EuiFlyoutProps, EuiFlyoutResizableProps, EuiGlobalToastListToast as EuiToast, EuiIconProps, EuiModalProps, IconType } from '@elastic/eui';
import { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { ConnectionRequestParams } from '@elastic/transport';
import { EvaluationContext as OpenFeatureEvaluationContext } from '@openfeature/core';
import { Provider } from '@openfeature/web-sdk';
import { EventEmitter } from 'events';
import { History as History$1, Href, LocationDescriptorObject } from 'history';
import { IncomingHttpHeaders } from 'http';
import { Container } from 'inversify';
import { Reference as InternalReference, Schema } from 'joi';
import moment$1 from 'moment';
import { Duration, Moment, isDuration } from 'moment';
import { OpenAPIV3 } from 'openapi-types';
import * as React$1 from 'react';
import React$1 from 'react';
import { ComponentType, DependencyList, FC, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';
import { IntlShape } from 'react-intl';
import { RouteComponentProps } from 'react-router-dom';
import { Observable } from 'rxjs';
import { DetailedPeerCertificate, PeerCertificate } from 'tls';
import { Assign } from 'utility-types';

declare abstract class AbstractDataView {
	/**
	 * Saved object id
	 */
	id?: string;
	/**
	 * Title of data view
	 * @deprecated use getIndexPattern instead
	 */
	title: string;
	/**
	 * Map of field formats by field name
	 */
	fieldFormatMap: FieldFormatMap;
	/**
	 * Only used by rollup indices, used by rollup specific endpoint to load field list.
	 */
	typeMeta?: TypeMeta$1;
	/**
	 * Timestamp field name
	 */
	timeFieldName: string | undefined;
	/**
	 * Type is used to identify rollup index patterns or ES|QL data views.
	 */
	type: string | undefined;
	/**
	 * List of meta fields by name
	 */
	metaFields: string[];
	/**
	 * SavedObject version
	 */
	version: string | undefined;
	/**
	 * Array of filters - hides fields in discover
	 */
	sourceFilters?: SourceFilter[];
	/**
	 * Array of namespace ids
	 */
	namespaces: string[];
	/**
	 * Original saved object body. Used to check for saved object changes.
	 */
	protected originalSavedObjectBody: SavedObjectBody;
	/**
	 * Returns true if short dot notation is enabled
	 */
	protected shortDotsEnable: boolean;
	/**
	 * FieldFormats service interface
	 */
	protected fieldFormats: FieldFormatsStartCommon;
	/**
	 * Map of field attributes by field name. Currently count and customLabel.
	 */
	protected fieldAttrs: FieldAttrs;
	/**
	 * Map of runtime field definitions by field name
	 */
	protected runtimeFieldMap: Record<string, RuntimeFieldSpec>;
	/**
	 * Prevents errors when index pattern exists before indices
	 */
	readonly allowNoIndex: boolean;
	/**
	 * Name of the data view. Human readable name used to differentiate data view.
	 */
	name: string;
	matchedIndices: string[];
	/**
	 * Whether the data view is managed by the application.
	 */
	managed: boolean;
	protected scriptedFieldsMap: DataViewFieldBaseSpecMap;
	private allowHidden;
	constructor(config: AbstractDataViewDeps);
	getAllowHidden: () => boolean;
	setAllowHidden: (allowHidden: boolean) => boolean;
	/**
	 * Get name of Data View
	 */
	getName: () => string;
	/**
	 * Get index pattern
	 * @returns index pattern string
	 */
	getIndexPattern: () => string;
	/**
	 * Set index pattern
	 * @param string index pattern string
	 */
	setIndexPattern: (indexPattern: string) => void;
	/**
	 * Get last saved saved object fields
	 */
	getOriginalSavedObjectBody: () => {
		fieldAttrs?: string;
		title?: string;
		timeFieldName?: string;
		fields?: string;
		sourceFilters?: string;
		fieldFormatMap?: string;
		typeMeta?: string;
		type?: string;
	};
	/**
	 * Reset last saved saved object fields. Used after saving.
	 */
	resetOriginalSavedObjectBody: () => void;
	/**
	 * Returns true if the data view is persisted, and false if the dataview is adhoc.
	 */
	isPersisted(): boolean;
	/**
	 * Get the source filtering configuration for that index.
	 */
	getSourceFiltering(): {
		excludes: string[];
	};
	/**
	 * Get aggregation restrictions. Rollup fields can only perform a subset of aggregations.
	 */
	getAggregationRestrictions(): Record<string, AggregationRestrictions> | undefined;
	/**
	 * Provide a field, get its formatter
	 * @param field field to get formatter for
	 */
	getFormatterForField(field: DataViewField | DataViewField["spec"]): FieldFormat;
	/**
	 * Get formatter for a given field name. Return undefined if none exists.
	 * @param fieldname name of field to get formatter for
	 */
	getFormatterForFieldNoDefault(fieldname: string): FieldFormat | undefined;
	/**
	 * Set field attribute
	 * @param fieldName name of field to set attribute on
	 * @param attrName name of attribute to set
	 * @param value value of attribute
	 */
	protected setFieldAttrs<K extends keyof FieldAttrSet>(fieldName: string, attrName: K, value: FieldAttrSet[K]): void;
	/**
	 * Set field custom label
	 * @param fieldName name of field to set custom label on
	 * @param customLabel custom label value. If undefined, custom label is removed
	 */
	protected setFieldCustomLabelInternal(fieldName: string, customLabel: string | undefined | null): void;
	/**
	 * Set field count
	 * @param fieldName name of field to set count on
	 * @param count count value. If undefined, count is removed
	 */
	protected setFieldCountInternal(fieldName: string, count: number | undefined | null): void;
	/**
	 * Set field custom description
	 * @param fieldName name of field to set custom description on
	 * @param customDescription custom description value. If undefined, custom description is removed
	 */
	protected setFieldCustomDescriptionInternal(fieldName: string, customDescription: string | undefined | null): void;
	/**
	 * Set field formatter
	 * @param fieldName name of field to set format on
	 * @param format field format in serialized form
	 */
	readonly setFieldFormat: (fieldName: string, format: SerializedFieldFormat) => void;
	/**
	 * Remove field format from the field format map.
	 * @param fieldName field name associated with the format for removal
	 */
	readonly deleteFieldFormat: (fieldName: string) => void;
	/**
	 * Returns index pattern as saved object body for saving
	 */
	getAsSavedObjectBody(): DataViewAttributes;
	protected toSpecShared(includeFields?: boolean): DataViewSpec;
	protected upsertScriptedFieldInternal: (field: FieldSpec) => void;
	protected deleteScriptedFieldInternal: (fieldName: string) => void;
	replaceAllScriptedFields(newFields: Record<string, FieldSpec>): void;
	removeScriptedField(name: string): void;
	upsertScriptedField(field: FieldSpec): void;
	/**
	 * Only used by search source to process sorting of scripted fields
	 * @param name field name
	 * @returns DataViewFieldBase
	 */
	getScriptedField(name: string): DataViewFieldBase | undefined;
	/**
	 * Checks if runtime field exists
	 * @param name field name
	 */
	hasRuntimeField(name: string): boolean;
	/**
	 * Returns runtime field if exists
	 * @param name Runtime field name
	 */
	getRuntimeField(name: string): RuntimeField | null;
	/**
	 * Get all runtime field definitions.
	 * NOTE: this does not strip out runtime fields that match mapped field names
	 * @returns map of runtime field definitions by field name
	 */
	getAllRuntimeFields(): Record<string, RuntimeField>;
	/**
	 * Replaces all existing runtime fields with new fields.
	 * @param newFields Map of runtime field definitions by field name
	 */
	replaceAllRuntimeFields(newFields: Record<string, RuntimeField>): void;
	removeRuntimeField(name: string): void;
	addRuntimeField(name: string, runtimeField: RuntimeField): void;
	protected removeRuntimeFieldInteral(name: string): void;
	protected addRuntimeFieldInteral(name: string, runtimeField: RuntimeField): void;
	getFieldAttrs: () => Map<string, FieldAttrSet>;
	/**
	 * Checks if there are any matched indices.
	 * @returns True if there are matched indices, false otherwise.
	 */
	hasMatchedIndices(): boolean;
}
declare abstract class FieldFormat {
	/**
	 * @property {string} - Field Format Id
	 * @static
	 * @public
	 */
	static id: string;
	/**
	 * Hidden field formats can only be accessed directly by id,
	 * They won't appear in field format editor UI,
	 * But they can be accessed and used from code internally.
	 *
	 * @property {boolean} -  Is this a hidden field format
	 * @static
	 * @public
	 */
	static hidden: boolean;
	/**
	 * @property {string} -  Field Format Title
	 * @static
	 * @public
	 */
	static title: string;
	/**
	 * @property {string} - Field Format Type
	 * @internal
	 */
	static fieldType: string | string[];
	/**
	 * @property {FieldFormatConvert}
	 * @internal
	 * have to remove the private because of
	 * https://github.com/Microsoft/TypeScript/issues/17293
	 */
	convertObject: FieldFormatConvert | undefined;
	/**
	 * @property {htmlConvert}
	 * @protected
	 * have to remove the protected because of
	 * https://github.com/Microsoft/TypeScript/issues/17293
	 */
	htmlConvert: HtmlContextTypeConvert | undefined;
	/**
	 * @property {textConvert}
	 * @protected
	 * have to remove the protected because of
	 * https://github.com/Microsoft/TypeScript/issues/17293
	 */
	textConvert: TextContextTypeConvert | undefined;
	/**
	 * @property {Function} - ref to child class
	 * @internal
	 */
	type: typeof FieldFormat;
	allowsNumericalAggregations?: boolean;
	protected readonly _params: FieldFormatParams & FieldFormatMetaParams;
	protected getConfig: FieldFormatsGetConfigFn | undefined;
	constructor(_params?: FieldFormatParams & FieldFormatMetaParams, getConfig?: FieldFormatsGetConfigFn);
	/**
	 * Convert a raw value to a formatted string
	 * @param  {unknown} value
	 * @param  {string} [contentType=text] - optional content type, the only two contentTypes
	 *                                currently supported are "html" and "text", which helps
	 *                                formatters adjust to different contexts
	 * @return {string} - the formatted string, which is assumed to be html, safe for
	 *                    injecting into the DOM or a DOM attribute
	 * @public
	 */
	convert(value: unknown, contentType?: FieldFormatsContentType, options?: HtmlContextTypeOptions | TextContextTypeOptions): string;
	/**
	 * Get a convert function that is bound to a specific contentType
	 * @param  {string} [contentType=text]
	 * @return {function} - a bound converter function
	 * @public
	 */
	getConverterFor(contentType?: FieldFormatsContentType): FieldFormatConvertFunction;
	/**
	 * Get parameter defaults
	 * @return {object} - parameter defaults
	 * @public
	 */
	getParamDefaults(): FieldFormatParams;
	/**
	 * Get the value of a param. This value may be a default value.
	 *
	 * @param  {string} name - the param name to fetch
	 * @return {any} TODO: https://github.com/elastic/kibana/issues/108158
	 * @public
	 */
	param(name: string): any;
	/**
	 * Get all of the params in a single object
	 * @return {object}
	 * @public
	 */
	params(): FieldFormatParams & FieldFormatMetaParams;
	/**
	 * Serialize this format to a simple POJO, with only the params
	 * that are not default
	 *
	 * @return {object}
	 * @public
	 */
	toJSON(): {
		id: string;
		params: (SerializableRecord & FieldFormatMetaParams) | undefined;
	};
	static from(convertFn: FieldFormatConvertFunction): FieldFormatInstanceType;
	setupContentType(): FieldFormatConvert;
	static isInstanceOfFieldFormat(fieldFormat: unknown): fieldFormat is FieldFormat;
}
declare abstract class ShareRegistryPublicApi {
	abstract setup(): {
		/**
		 * @description registers a share menu provider for a specific object type
		 */
		registerShareIntegration: ShareRegistryInternalApi["registerShareIntegration"];
	};
	abstract start(args: ShareRegistryApiStart): {
		resolveShareItemsForShareContext: ShareRegistryInternalApi["resolveShareItemsForShareContext"];
	};
}
declare abstract class Type<V> {
	readonly type: V;
	readonly __isKbnConfigSchemaType = true;
	/**
	 * Internal "schema" backed by Joi.
	 * @type {Schema}
	 */
	protected readonly internalSchema: Schema;
	protected constructor(schema: Schema, options?: TypeOptions<V>);
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
	getSchema(): Schema;
	getSchemaStructure(): SchemaStructureEntry[];
	protected handleError(type: string, context: Record<string, any>, path: string[]): string | SchemaTypeError | void;
	private onError;
}
declare class AddDataService {
	private addDataTabs;
	setup(): {
		/**
		 * Registers a component that will be rendered as a new tab in the Add data page
		 */
		registerAddDataTab: (tab: AddDataTab) => void;
	};
	getAddDataTabs(): AddDataTab[];
}
declare class AggConfig {
	/**
	 * Ensure that all of the objects in the list have ids, the objects
	 * and list are modified by reference.
	 *
	 * @param  {array[object]} list - a list of objects, objects can be anything really
	 * @return {array} - the list that was passed in
	 */
	static ensureIds(list: any[]): any[];
	/**
	 * Calculate the next id based on the ids in this list
	 *
	 * @return {array} list - a list of objects with id properties
	 */
	static nextId(list: IAggConfig[]): number;
	aggConfigs: IAggConfigs;
	id: string;
	enabled: boolean;
	params: any;
	parent?: IAggConfigs;
	brandNew?: boolean;
	schema?: string;
	private __type;
	private __typeDecorations;
	private subAggs;
	constructor(aggConfigs: IAggConfigs, opts: AggConfigOptions);
	/**
	 * Write the current values to this.params, filling in the defaults as we go
	 *
	 * @param  {object} [from] - optional object to read values from,
	 *                         used when initializing
	 * @return {undefined}
	 */
	setParams(from: any): void;
	getParam(key: string): any;
	hasTimeShift(): boolean;
	getTimeShift(): undefined | moment$1.Duration;
	write(aggs?: IAggConfigs): Record<string, any>;
	isFilterable(): boolean;
	createFilter(key: string, params?: {}): any;
	/**
	 *  Hook for pre-flight logic, see AggType#onSearchRequestStart
	 *  @param {SearchSource} searchSource
	 *  @param {ISearchOptions} options
	 *  @return {Promise<undefined>}
	 */
	onSearchRequestStart(searchSource: ISearchSource, options?: ISearchOptions): Promise<void> | Promise<any[]>;
	/**
	 * Convert this aggConfig to its dsl syntax.
	 *
	 * Adds params and adhoc subaggs to a pojo, then returns it
	 *
	 * @param  {AggConfigs} aggConfigs - the config object to convert
	 * @return {void|Object} - if the config has a dsl representation, it is
	 *                         returned, else undefined is returned
	 */
	toDsl(aggConfigs?: IAggConfigs): any;
	/**
	 * @returns Returns a serialized representation of an AggConfig.
	 */
	serialize(): AggConfigSerialized;
	/**
	 * @deprecated Use serialize() instead.
	 * @removeBy 8.1
	 */
	toJSON(): AggConfigSerialized;
	/**
	 * Returns a serialized field format for the field used in this agg.
	 * This can be passed to fieldFormats.deserialize to get the field
	 * format instance.
	 *
	 * @public
	 */
	toSerializedFieldFormat<T extends FieldFormatParams>(): SerializedFieldFormat<T>;
	/**
	 * @returns Returns an ExpressionAst representing the this agg type.
	 */
	toExpressionAst(): ExpressionAstExpression | undefined;
	getAggParams(): AggParamType<AggConfig>[];
	getRequestAggs(): AggConfig[];
	getResponseAggs(): AggConfig[];
	getValue(bucket: any): any;
	getResponseId(): string;
	getKey(bucket: any, key?: string): any;
	getFieldDisplayName(): any;
	getField(): any;
	/**
	 * Returns the bucket path containing the main value the agg will produce
	 * (e.g. for sum of bytes it will point to the sum, for median it will point
	 *  to the 50 percentile in the percentile multi value bucket)
	 */
	getValueBucketPath(): string;
	makeLabel(percentageMode?: boolean): any;
	getIndexPattern(): DataView$1;
	getTimeRange(): TimeRange | undefined;
	fieldName(): any;
	fieldIsTimeField(): boolean;
	get type(): IAggType;
	set type(type: IAggType);
	setType(type: IAggType): void;
}
declare class AggConfigs {
	indexPattern: DataView$1;
	private opts;
	private getConfig;
	timeRange?: TimeRange;
	timeFields?: string[];
	forceNow?: Date;
	aggs: IAggConfig[];
	readonly timeZone: string;
	constructor(indexPattern: DataView$1, configStates: CreateAggConfigParams[] | undefined, opts: AggConfigsOptions, getConfig: GetConfigFn);
	get hierarchical(): boolean;
	get partialRows(): boolean;
	get samplerConfig(): {
		probability: number;
		seed: number | undefined;
	};
	isSamplingEnabled(): boolean;
	setTimeFields(timeFields: string[] | undefined): void;
	setForceNow(now: Date | undefined): void;
	setTimeRange(timeRange: TimeRange): void;
	/**
	 * Returns the current time range as moment instance (date math will get resolved using the current "now" value or system time if not set)
	 * @returns Current time range as resolved date.
	 */
	getResolvedTimeRange(): TimeRangeBounds | undefined;
	clone({ enabledOnly, opts, }?: {
		enabledOnly?: boolean;
		opts?: Partial<AggConfigsOptions>;
	}): AggConfigs;
	createAggConfig: <T extends AggConfig = AggConfig>(params: CreateAggConfigParams, { addToAggConfigs }?: {
		addToAggConfigs?: boolean | undefined;
	}) => T;
	/**
	 * Data-by-data comparison of this Aggregation
	 * Ignores the non-array indexes
	 * @param aggConfigs an AggConfigs instance
	 */
	jsonDataEquals(aggConfigs: AggConfig[]): boolean;
	toDsl(): Record<string, any>;
	getAll(): AggConfig[];
	byIndex(index: number): AggConfig;
	byId(id: string): AggConfig | undefined;
	byName(name: string): AggConfig[];
	byType(type: string): AggConfig[];
	byTypeName(type: string): AggConfig[];
	bySchemaName(schema: string): AggConfig[];
	getRequestAggs(): AggConfig[];
	getTimeShifts(): Record<string, moment$1.Duration>;
	getTimeShiftInterval(): moment$1.Duration | undefined;
	hasTimeShifts(): boolean;
	getSearchSourceTimeFilter(forceNow?: Date): RangeFilter[] | {
		meta: {
			index: string | undefined;
			params: {};
			alias: string;
			disabled: boolean;
			negate: boolean;
		};
		query: {
			bool: {
				should: {
					bool: {
						filter: {
							range: {
								[x: string]: {
									format: string;
									gte: string;
									lte: string;
								};
							};
						}[];
					};
				}[];
				minimum_should_match: number;
			};
		};
	}[];
	postFlightTransform(response: IEsSearchResponse): IEsSearchResponse;
	getRequestAggById(id: string): AggConfig | undefined;
	/**
	 * Gets the AggConfigs (and possibly ResponseAggConfigs) that
	 * represent the values that will be produced when all aggs
	 * are run.
	 *
	 * With multi-value metric aggs it is possible for a single agg
	 * request to result in multiple agg values, which is why the length
	 * of a vis' responseValuesAggs may be different than the vis' aggs
	 *
	 * @return {array[AggConfig]}
	 */
	getResponseAggs(): AggConfig[];
	/**
	 * Find a response agg by it's id. This may be an agg in the aggConfigs, or one
	 * created specifically for a response value
	 *
	 * @param  {string} id - the id of the agg to find
	 * @return {AggConfig}
	 */
	getResponseAggById(id: string): AggConfig | undefined;
	onSearchRequestStart(searchSource: ISearchSource, options?: ISearchOptions): Promise<(void | any[])[]>;
	/**
	 * Generates an expression abstract syntax tree using the `esaggs` expression function.
	 * @returns The expression AST.
	 */
	toExpressionAst(): ExpressionAstExpression;
}
declare class AggParamType<TAggConfig extends IAggConfig = IAggConfig> extends BaseParamType<TAggConfig> {
	makeAgg: (agg: TAggConfig, state?: AggConfigSerialized) => TAggConfig;
	allowedAggs: string[];
	constructor(config: Record<string, any>);
}
declare class AggType<TAggConfig extends AggConfig = AggConfig, TParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>> {
	/**
	 * the unique, unchanging, name that we have assigned this aggType
	 *
	 * @property name
	 * @type {string}
	 */
	name: string;
	type: string;
	subtype?: string;
	/**
	 * the name of the elasticsearch aggregation that this aggType represents. Usually just this.name
	 *
	 * @property name
	 * @type {string}
	 */
	dslName: string;
	/**
	 * the name of the expression function that this aggType represents.
	 *
	 * @property name
	 * @type {string}
	 */
	expressionName: string;
	/**
	 * the user friendly name that will be shown in the ui for this aggType
	 *
	 * @property title
	 * @type {string}
	 */
	title: string;
	/**
	 * The type the values produced by this agg will have in the final data table.
	 * If not specified, the type of the field is used.
	 */
	getValueType?: (aggConfig: TAggConfig) => DatatableColumnType;
	/**
	 * a function that will be called when this aggType is assigned to
	 * an aggConfig, and that aggConfig is being rendered (in a form, chart, etc.).
	 *
	 * @method makeLabel
	 * @param {AggConfig} aggConfig - an agg config of this type
	 * @returns {string} - label that can be used in the ui to describe the aggConfig
	 */
	makeLabel: ((aggConfig: TAggConfig) => string) | (() => string);
	/**
	 * Describes if this aggType creates data that is ordered, and if that ordered data
	 * is some sort of time series.
	 *
	 * If the aggType does not create ordered data, set this to something "falsy".
	 *
	 * If this does create orderedData, then the value should be an object.
	 *
	 * If the orderdata is some sort of time series, `this.ordered` should be an object
	 * with the property `date: true`
	 *
	 * @property ordered
	 * @type {object|undefined}
	 */
	ordered: any;
	/**
	 * Flag that prevents this aggregation from being included in the dsl. This is only
	 * used by the count aggregation (currently) since it doesn't really exist and it's output
	 * is available on every bucket.
	 *
	 * @type {Boolean}
	 */
	hasNoDsl: boolean;
	/**
	 * Flag that prevents params from this aggregation from being included in the dsl. Sibling and parent aggs are still written.
	 *
	 * @type {Boolean}
	 */
	hasNoDslParams: boolean;
	/**
	 * The method to create a filter representation of the bucket
	 * @param {object} aggConfig The instance of the aggConfig
	 * @param {mixed} key The key for the bucket
	 * @returns {object} The filter
	 */
	createFilter: ((aggConfig: TAggConfig, key: any, params?: any) => any) | undefined;
	/**
	 * An instance of {{#crossLink "AggParams"}}{{/crossLink}}.
	 *
	 * @property params
	 * @type {AggParams}
	 */
	params: TParam[];
	/**
	 * Designed for multi-value metric aggs, this method can return a
	 * set of AggConfigs that should replace this aggConfig in requests
	 *
	 * @method getRequestAggs
	 * @returns {array[AggConfig]} - an array of aggConfig objects
	 *                                         that should replace this one,
	 *                                         or undefined
	 */
	getRequestAggs: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
	/**
	 * Designed for multi-value metric aggs, this method can return a
	 * set of AggConfigs that should replace this aggConfig in result sets
	 * that walk the AggConfig set.
	 *
	 * @method getResponseAggs
	 * @returns {array[AggConfig]|undefined} - an array of aggConfig objects
	 *                                         that should replace this one,
	 *                                         or undefined
	 */
	getResponseAggs: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
	/**
	 * A function that will be called each time an aggConfig of this type
	 * is created, giving the agg type a chance to modify the agg config
	 */
	decorateAggConfig: () => any;
	hasPrecisionError?: (aggBucket: Record<string, unknown>) => boolean;
	/**
	 * A function that needs to be called after the main request has been made
	 * and should return an updated response
	 * @param aggConfigs - agg config array used to produce main request
	 * @param aggConfig - AggConfig that requested the post flight request
	 * @param searchSourceAggs - SearchSource aggregation configuration
	 * @param resp - Response to the main request
	 * @param nestedSearchSource - the new SearchSource that will be used to make post flight request
	 * @param abortSignal - `AbortSignal` to abort the request
	 * @param searchSessionId - searchSessionId to be used for grouping requests into a single search session
	 * @return {Promise}
	 */
	postFlightRequest: PostFlightRequestFn<TAggConfig>;
	/**
	 * Get the serialized format for the values produced by this agg type,
	 * overridden by several metrics that always output a simple number.
	 * You can pass this output to fieldFormatters.deserialize to get
	 * the formatter instance.
	 *
	 * @param  {agg} agg - the agg to pick a format for
	 * @return {SerializedFieldFormat}
	 */
	getSerializedFormat: <T extends FieldFormatParams>(agg: TAggConfig) => SerializedFieldFormat<T>;
	getValue: (agg: TAggConfig, bucket: any) => any;
	getKey?: (bucket: any, key: any, agg: TAggConfig) => any;
	paramByName: (name: string) => TParam | undefined;
	getValueBucketPath: (agg: TAggConfig) => string;
	splitForTimeShift(agg: TAggConfig, aggs: IAggConfigs): boolean;
	/**
	 * Returns the key of the object containing the results of the agg in the Elasticsearch response object.
	 * In most cases this returns the `agg.id` property, but in some cases the response object is structured differently.
	 * In the following example of a terms agg, `getResponseId` returns "myAgg":
	 * ```
	 * {
	 *    "aggregations": {
	 *      "myAgg": {
	 *        "doc_count_error_upper_bound": 0,
	 *        "sum_other_doc_count": 0,
	 *        "buckets": [
	 * ...
	 * ```
	 *
	 * @param  {agg} agg - the agg to return the id in the ES reponse object for
	 * @return {string}
	 */
	getResponseId: (agg: TAggConfig) => string;
	/**
	 * Generic AggType Constructor
	 *
	 * Used to create the values exposed by the agg_types module.
	 *
	 * @class AggType
	 * @internal
	 * @param {object} config - used to set the properties of the AggType
	 */
	constructor(config: AggTypeConfig<TAggConfig>);
}
declare class AggTypesRegistry {
	private readonly bucketAggs;
	private readonly metricAggs;
	private readonly legacyAggs;
	setup: () => {
		registerBucket: <N extends string, T extends (deps: AggTypesDependencies) => BucketAggType<any>>(name: N, type: T) => void;
		registerMetric: <N extends string, T extends (deps: AggTypesDependencies) => MetricAggType<any>>(name: N, type: T) => void;
		registerLegacy: <N extends string, T extends (deps: AggTypesDependencies) => BucketAggType<any> | MetricAggType<any>>(name: N, type: T) => void;
	};
	start: (aggTypesDependencies: AggTypesDependencies) => {
		get: (name: string) => BucketAggType<any> | MetricAggType<any> | undefined;
		getAll: () => {
			buckets: BucketAggType<any>[];
			metrics: MetricAggType<any>[];
		};
	};
}
declare class BaseParamType<TAggConfig extends IAggConfig = IAggConfig> {
	name: string;
	type: string;
	displayName: string;
	required: boolean;
	advanced: boolean;
	default: any;
	write: (aggConfig: TAggConfig, output: Record<string, any>, aggConfigs?: IAggConfigs, locals?: Record<string, any>) => void;
	serialize: (value: any, aggConfig?: TAggConfig) => any;
	deserialize: (value: any, aggConfig?: TAggConfig) => any;
	toExpressionAst?: (value: any) => ExpressionAstExpression[] | ExpressionAstExpression | undefined;
	options: any[];
	getValueType: (aggConfig: IAggConfig) => any;
	onChange?(agg: TAggConfig): void;
	shouldShow?(agg: TAggConfig): boolean;
	/**
	 *  A function that will be called before an aggConfig is serialized and sent to ES.
	 *  Allows aggConfig to retrieve values needed for serialization
	 *  Example usage: an aggregation needs to know the min/max of a field to determine an appropriate interval
	 *
	 *  @param {AggConfig} aggConfig
	 *  @param {Courier.SearchSource} searchSource
	 *  @returns {Promise<undefined>|undefined}
	 */
	modifyAggConfigOnSearchRequestStart: (aggConfig: TAggConfig, searchSource?: ISearchSource, options?: ISearchOptions) => void;
	constructor(config: Record<string, any>);
}
declare class BrowserShortUrlClient implements IShortUrlClient {
	private readonly dependencies;
	constructor(dependencies: BrowserShortUrlClientDependencies);
	create<P extends SerializableRecord>({ locator, params, slug, }: ShortUrlCreateParams<P>): Promise<ShortUrl<P>>;
	createWithLocator<P extends SerializableRecord>(params: ShortUrlCreateParams<P>, isAbsoluteTime?: boolean): Promise<ShortUrlCreateResponse<P>>;
	createFromLongUrl(longUrl: string, isAbsoluteTime?: boolean): Promise<ShortUrlCreateFromLongUrlResponse>;
	get(id: string): Promise<ShortUrl>;
	resolve(slug: string): Promise<ShortUrl>;
	delete(id: string): Promise<void>;
}
declare class BucketAggType<TBucketAggConfig extends IAggConfig = IBucketAggConfig> extends AggType<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
	getKey: (bucket: any, key: any, agg: TBucketAggConfig) => any;
	type: string;
	getShiftedKey(agg: TBucketAggConfig, key: string | number, timeShift: moment$1.Duration): string | number;
	getTimeShiftInterval(agg: TBucketAggConfig): undefined | moment$1.Duration;
	orderBuckets(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number;
	constructor(config: BucketAggTypeConfig<TBucketAggConfig>);
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
declare class DataView$1 extends AbstractDataView implements DataViewBase {
	/**
	 * Field list, in extended array format
	 */
	fields: IIndexPatternFieldList & {
		toSpec: () => DataViewFieldMap;
	};
	/**
	 * @deprecated Use `flattenHit` utility method exported from data plugin instead.
	 */
	flattenHit: (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;
	private etag;
	/**
	 * constructor
	 * @param config - config data and dependencies
	 */
	constructor(config: DataViewDeps);
	getScriptedFieldsForQuery(): Record<string, estypes.ScriptField>;
	getEtag: () => string | undefined;
	setEtag: (etag: string | undefined) => string | undefined;
	/**
	 * Returns scripted fields
	 */
	getComputedFields(): {
		scriptFields: Record<string, estypes.ScriptField>;
		docvalueFields: {
			field: string;
			format: string;
		}[];
		runtimeFields: estypes.MappingRuntimeFields;
	};
	/**
	 * Creates static representation of the data view.
	 * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
	 * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
	 */
	toSpec(includeFields?: boolean): DataViewSpec;
	/**
	 * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
	 */
	toMinimalSpec(params?: {
		keepFieldAttrs?: Array<"customLabel" | "customDescription">;
	}): Omit<DataViewSpec, "fields">;
	/**
	 * Removes scripted field from field list.
	 * @param fieldName name of scripted field to remove
	 * @deprecated use runtime field instead
	 */
	removeScriptedField(fieldName: string): void;
	/**
	 *
	 * @deprecated Will be removed when scripted fields are removed.
	 */
	getNonScriptedFields(): DataViewField[];
	/**
	 *
	 * @deprecated Use runtime field instead.
	 */
	getScriptedFields(): DataViewField[];
	/**
	 * returns true if dataview contains TSDB fields
	 */
	isTSDBMode(): boolean;
	/**
	 * Does the data view have a timestamp field?
	 */
	isTimeBased(): this is TimeBasedDataView;
	/**
	 * Does the data view have a timestamp field and is it a date nanos field?
	 */
	isTimeNanosBased(): this is TimeBasedDataView;
	/**
	 * Get timestamp field as DataViewField or return undefined
	 */
	getTimeField(): DataViewField | undefined;
	/**
	 * Get field by name.
	 * @param name field name
	 */
	getFieldByName(name: string): DataViewField | undefined;
	/**
	 * Add a runtime field - Appended to existing mapped field or a new field is
	 * created as appropriate.
	 * @param name Field name
	 * @param runtimeField Runtime field definition
	 */
	addRuntimeField(name: string, runtimeField: RuntimeField): DataViewField[];
	/**
	 * Returns data view fields backed by runtime fields.
	 * @param name runtime field name
	 * @returns map of DataViewFields (that are runtime fields) by field name
	 */
	getFieldsByRuntimeFieldName(name: string): Record<string, DataViewField> | undefined;
	/**
	 * Remove a runtime field - removed from mapped field or removed unmapped
	 * field as appropriate. Doesn't clear associated field attributes.
	 * @param name - Field name to remove
	 */
	removeRuntimeField(name: string): void;
	/**
	 * Return the "runtime_mappings" section of the ES search query.
	 */
	getRuntimeMappings(): estypes.MappingRuntimeFields;
	/**
	 * Set field custom label
	 * @param fieldName name of field to set custom label on
	 * @param customLabel custom label value. If undefined, custom label is removed
	 */
	setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null): void;
	/**
	 * Set field custom description
	 * @param fieldName name of field to set custom label on
	 * @param customDescription custom description value. If undefined, custom description is removed
	 */
	setFieldCustomDescription(fieldName: string, customDescription: string | undefined | null): void;
	/**
	 * Set field count
	 * @param fieldName name of field to set count on
	 * @param count count value. If undefined, count is removed
	 */
	setFieldCount(fieldName: string, count: number | undefined | null): void;
	/**
	 * Add composite runtime field and all subfields.
	 * @param name field name
	 * @param runtimeField runtime field definition
	 * @returns data view field instance
	 */
	private addCompositeRuntimeField;
	private updateOrAddRuntimeField;
	upsertScriptedField: (field: FieldSpec) => void;
}
declare class DataViewField implements DataViewFieldBase {
	readonly spec: FieldSpec;
	/**
	 * Kbn field type, used mainly for formattering.
	 */
	private readonly kbnFieldType;
	/**
	 * DataView constructor
	 * @constructor
	 * @param spec Configuration for the field
	 */
	constructor(spec: FieldSpec);
	/**
	 * Count is used for field popularity in discover.
	 */
	get count(): number;
	/**
	 * Set count, which is used for field popularity in discover.
	 * @param count count number
	 */
	set count(count: number);
	get defaultFormatter(): string | undefined;
	/**
	 * Returns runtime field definition or undefined if field is not runtime field.
	 */
	get runtimeField(): RuntimeFieldSpec | undefined;
	/**
	 * Sets runtime field definition or unsets if undefined is provided.
	 * @param runtimeField runtime field definition
	 */
	set runtimeField(runtimeField: RuntimeFieldSpec | undefined);
	/**
	 * Script field code
	 */
	get script(): string | undefined;
	/**
	 * Sets scripted field painless code
	 * @param script Painless code
	 */
	set script(script: string | undefined);
	/**
	 * Script field language
	 */
	get lang(): string | undefined;
	/**
	 * Sets scripted field langauge.
	 * @param lang Scripted field language
	 */
	set lang(lang: string | undefined);
	/**
	 * Returns custom label if set, otherwise undefined.
	 */
	get customLabel(): string | undefined;
	/**
	 * Sets custom label for field, or unsets if passed undefined.
	 * @param customLabel custom label value
	 */
	set customLabel(customLabel: string | undefined);
	/**
	 * Returns custom description if set, otherwise undefined.
	 */
	get customDescription(): string | undefined;
	/**
	 * Sets custom description for field, or unsets if passed undefined.
	 * @param customDescription custom label value
	 */
	set customDescription(customDescription: string | undefined);
	/**
	 * Description of field type conflicts across different indices in the same index pattern.
	 */
	get conflictDescriptions(): Record<string, string[]> | undefined;
	/**
	 * Sets conflict descriptions for field.
	 * @param conflictDescriptions conflict descriptions
	 */
	set conflictDescriptions(conflictDescriptions: Record<string, string[]> | undefined);
	/**
	 * Get field name
	 */
	get name(): string;
	/**
	 * Gets display name, calcualted based on name, custom label and shortDotsEnable.
	 */
	get displayName(): string;
	/**
	 * Gets field type
	 */
	get type(): string;
	/**
	 * Gets ES types as string array
	 */
	get esTypes(): string[] | undefined;
	/**
	 * Returns true if scripted field
	 */
	get scripted(): boolean;
	/**
	 * Returns true if field is searchable
	 */
	get searchable(): boolean;
	/**
	 * Returns true if field is aggregatable
	 */
	get aggregatable(): boolean;
	/**
	 * returns true if field is a TSDB dimension field
	 */
	get timeSeriesDimension(): boolean;
	/**
	 * returns type of TSDB metric or undefined
	 */
	get timeSeriesMetric(): import("@elastic/elasticsearch/lib/api/types").MappingTimeSeriesMetricType | undefined;
	/**
	 * returns list of alloeed fixed intervals
	 */
	get fixedInterval(): string[] | undefined;
	/**
	 * returns true if the field is of rolled up type
	 */
	get isRolledUpField(): boolean | undefined;
	/**
	 * return list of allowed time zones
	 */
	get timeZone(): string[] | undefined;
	/**
	 * Returns true if field is available via doc values
	 */
	get readFromDocValues(): boolean;
	/**
	 * Returns field subtype, multi, nested, or undefined if neither
	 */
	get subType(): IFieldSubType | undefined;
	/**
	 * Is the field part of the index mapping?
	 */
	get isMapped(): boolean | undefined;
	/**
	 * Returns true if runtime field defined on data view
	 */
	get isRuntimeField(): boolean;
	/**
	 * Returns true if field is sortable
	 */
	get sortable(): boolean;
	/**
	 * Returns true if field is filterable
	 */
	get filterable(): boolean;
	/**
	 * Returns true if field is visualizable
	 */
	get visualizable(): boolean;
	/**
	 * Returns true if field is Empty
	 */
	get isNull(): boolean;
	/**
	 * Returns true if field is subtype nested
	 */
	isSubtypeNested(): boolean;
	/**
	 * Returns true if field is subtype multi
	 */
	isSubtypeMulti(): boolean;
	/**
	 * Returns subtype nested data if exists
	 */
	getSubtypeNested(): IFieldSubTypeNested | undefined;
	/**
	 * Returns subtype multi data if exists
	 */
	getSubtypeMulti(): IFieldSubTypeMulti | undefined;
	/**
	 * Deletes count value. Popularity as used by discover
	 */
	deleteCount(): void;
	/**
	 * JSON version of field
	 */
	toJSON(): {
		count: number;
		script: string | undefined;
		lang: string | undefined;
		conflictDescriptions: Record<string, string[]> | undefined;
		name: string;
		type: string;
		esTypes: string[] | undefined;
		scripted: boolean;
		searchable: boolean;
		aggregatable: boolean;
		readFromDocValues: boolean;
		subType: IFieldSubType | undefined;
		customLabel: string | undefined;
		customDescription: string | undefined;
		defaultFormatter: string | undefined;
	};
	/**
	 * Get field in serialized form - fieldspec.
	 * @param config provide a method to get a field formatter
	 * @returns field in serialized form - field spec
	 */
	toSpec(config?: ToSpecConfig): FieldSpec;
	/**
	 * Returns true if composite runtime field
	 */
	isRuntimeCompositeSubField(): boolean;
}
declare class DataViewLazy extends AbstractDataView {
	private apiClient;
	private fieldCache;
	/**
	 * Returns true if scripted fields are enabled
	 */
	protected scriptedFieldsEnabled: boolean;
	constructor(config: DataViewDeps$1);
	getFields({ mapped, scripted, runtime, fieldName, forceRefresh, unmapped, indexFilter, metaFields, }: GetFieldsParams): Promise<{
		getFieldMap: () => DataViewFieldMap$1;
		getFieldMapSorted: () => Record<string, DataViewField>;
	}>;
	getRuntimeFields: ({ fieldName }: Pick<GetFieldsParams, "fieldName">) => DataViewFieldMap$1;
	/**
	 * Add a runtime field - Appended to existing mapped field or a new field is
	 * created as appropriate.
	 * @param name Field name
	 * @param runtimeField Runtime field definition
	 */
	addRuntimeField(name: string, runtimeField: RuntimeField): Promise<DataViewField[]>;
	private addCompositeRuntimeField;
	/**
	 * Remove a runtime field - removed from mapped field or removed unmapped
	 * field as appropriate. Doesn't clear associated field attributes.
	 * @param name - Field name to remove
	 */
	removeRuntimeField(name: string): void;
	private getFieldsByRuntimeFieldName;
	private updateOrAddRuntimeField;
	private getRuntimeFieldSpecMap;
	getScriptedFields({ fieldName }: Pick<GetFieldsParams, "fieldName">): Record<string, DataViewField>;
	private getMappedFields;
	getScriptedFieldsForQuery(): Record<string, estypes.ScriptField>;
	getComputedFields({ fieldName }: {
		fieldName: string[];
	}): Promise<{
		scriptFields: Record<string, estypes.ScriptField>;
		docvalueFields: {
			field: string;
			format: string;
		}[];
		runtimeFields: estypes.MappingRuntimeFields;
	}>;
	getRuntimeMappings(): estypes.MappingRuntimeFields;
	/**
	 * Creates static representation of the data view.
	 * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
	 * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
	 */
	toSpec(params?: {
		fieldParams?: GetFieldsParams;
	}): Promise<DataViewSpec>;
	/**
	 * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
	 */
	toMinimalSpec(params?: {
		keepFieldAttrs?: Array<"customLabel" | "customDescription">;
	}): Omit<DataViewSpec, "fields">;
	/**
	 * returns true if dataview contains TSDB fields
	 */
	isTSDBMode(): Promise<boolean>;
	removeScriptedField(fieldName: string): void;
	upsertScriptedField(field: FieldSpec): void;
	isTimeBased: () => Promise<boolean>;
	isTimeNanosBased(): Promise<boolean>;
	getTimeField: () => Promise<DataViewField> | undefined;
	getFieldByName(name: string, forceRefresh?: boolean): Promise<DataViewField>;
	/**
	 * Set field custom label
	 * @param fieldName name of field to set custom label on
	 * @param customLabel custom label value. If undefined, custom label is removed
	 */
	setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null): void;
	setFieldCount(fieldName: string, count: number | undefined | null): void;
	setFieldCustomDescription(fieldName: string, customDescription: string | undefined | null): void;
}
declare class DataViewsService {
	private config;
	private savedObjectsClient;
	private savedObjectsCache?;
	private apiClient;
	private fieldFormats;
	/**
	 * Handler for service notifications
	 * @param toastInputFields notification content in toast format
	 * @param key used to indicate uniqueness of the notification
	 */
	private onNotification;
	private onError;
	private dataViewCache;
	private dataViewLazyCache;
	/**
	 * Can the user save advanced settings?
	 */
	private getCanSaveAdvancedSettings;
	/**
	 * Can the user save data views?
	 */
	getCanSave: () => Promise<boolean>;
	readonly scriptedFieldsEnabled: boolean;
	/**
	 * DataViewsService constructor
	 * @param deps Service dependencies
	 */
	constructor(deps: DataViewsServiceDeps);
	/**
	 * Refresh cache of index pattern ids and titles.
	 */
	private refreshSavedObjectsCache;
	/**
	 * Gets list of index pattern ids.
	 * @param refresh Force refresh of index pattern list
	 */
	getIds: (refresh?: boolean) => Promise<string[]>;
	/**
	 * Gets list of index pattern titles.
	 * @param refresh Force refresh of index pattern list
	 */
	getTitles: (refresh?: boolean) => Promise<string[]>;
	/**
	 * Find and load index patterns by title.
	 * @param search Search string
	 * @param size  Number of data views to return
	 * @returns DataView[]
	 */
	find: (search: string, size?: number) => Promise<DataView$1[]>;
	/**
	 * Find and load lazy data views by title.
	 * @param search Search string
	 * @param size  Number of data views to return
	 * @returns DataViewLazy[]
	 */
	findLazy: (search: string, size?: number) => Promise<DataViewLazy[]>;
	/**
	 * Gets list of index pattern ids with titles.
	 * @param refresh Force refresh of index pattern list
	 */
	getIdsWithTitle: (refresh?: boolean) => Promise<DataViewListItem[]>;
	getAllDataViewLazy: (refresh?: boolean) => Promise<DataViewLazy[]>;
	/**
	 * Clear index pattern saved objects cache.
	 */
	clearCache: () => void;
	/**
	 * Clear index pattern instance cache
	 */
	clearInstanceCache: (id?: string) => void;
	/**
	 * Clear instance in data view lazy cache
	 */
	clearDataViewLazyCache: (id: string) => void;
	/**
	 * Get cache, contains data view saved objects.
	 */
	getCache: () => Promise<SavedObject<DataViewSavedObjectAttrs>[] | null | undefined>;
	/**
	 * Get default index pattern
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	getDefault: (displayErrors?: boolean) => Promise<DataView$1 | null>;
	/**
	 * Get default index pattern id
	 */
	getDefaultId: () => Promise<string | null>;
	/**
	 * Optionally set default index pattern, unless force = true
	 * @param id data view id
	 * @param force set default data view even if there's an existing default
	 */
	setDefault: (id: string | null, force?: boolean) => Promise<void>;
	/**
	 * Checks if current user has a user created index pattern ignoring fleet's server default index patterns.
	 */
	hasUserDataView(): Promise<boolean>;
	getMetaFields: () => Promise<string[] | undefined>;
	getShortDotsEnable: () => Promise<boolean | undefined>;
	/**
	 * Get field list by providing { pattern }.
	 * @param options options for getting field list
	 * @returns FieldSpec[]
	 */
	getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldSpec[]>;
	/**
	 * Get field list by providing an index pattern (or spec).
	 * @param options options for getting field list
	 * @returns FieldSpec[]
	 */
	getFieldsForIndexPattern: (indexPattern: DataView$1 | DataViewSpec, options?: Omit<GetFieldsOptions, "allowNoIndex" | "pattern">) => Promise<FieldSpec[]>;
	private getFieldsAndIndicesForDataView;
	private getFieldsAndIndicesForWildcard;
	private refreshFieldsFn;
	/**
	 * Refresh field list for a given data view.
	 * @param dataView
	 * @param displayErrors  - If set false, API consumer is responsible for displaying and handling errors.
	 */
	refreshFields: (dataView: DataView$1, displayErrors?: boolean, forceRefresh?: boolean) => Promise<void>;
	/**
	 * Refreshes a field list from a spec before an index pattern instance is created.
	 * @param fields
	 * @param id
	 * @param title
	 * @param options
	 * @returns Record<string, FieldSpec>
	 */
	private refreshFieldSpecMap;
	/**
	 * Converts field array to map.
	 * @param fields: FieldSpec[]
	 * @param fieldAttrs: FieldAttrs
	 * @returns Record<string, FieldSpec>
	 */
	fieldArrayToMap: (fields: FieldSpec[], fieldAttrs?: FieldAttrsAsObject) => DataViewFieldMap;
	/**
	 * Converts data view saved object to data view spec.
	 * @param savedObject
	 * @returns DataViewSpec
	 */
	savedObjectToSpec: (savedObject: SavedObject<DataViewAttributes>) => DataViewSpec;
	private getSavedObjectAndInit;
	private initFromSavedObjectLoadFields;
	private initFromSavedObject;
	private getRuntimeFields;
	getDataViewLazy: (id: string) => Promise<DataViewLazy>;
	getDataViewLazyFromCache: (id: string) => Promise<DataViewLazy | undefined>;
	/**
	 * Get an index pattern by id, cache optimized.
	 * @param id
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 * @param refreshFields - If set true, will fetch fields from the index pattern
	 */
	get: (id: string, displayErrors?: boolean, refreshFields?: boolean) => Promise<DataView$1>;
	/**
	 * Create a new data view instance.
	 * @param spec data view spec
	 * @param skipFetchFields if true, will not fetch fields
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 * @returns DataView
	 */
	private createFromSpec;
	/**
	 * Create data view instance.
	 * @param spec data view spec
	 * @param skipFetchFields if true, will not fetch fields
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 * @returns DataView
	 */
	create(spec: DataViewSpec, skipFetchFields?: boolean, displayErrors?: boolean): Promise<DataView$1>;
	/**
	 * Create a new data view instance.
	 * @param spec data view spec
	 * @returns DataViewLazy
	 */
	private createFromSpecLazy;
	/**
	 * Create data view lazy instance.
	 * @param spec data view spec
	 * @returns DataViewLazy
	 */
	createDataViewLazy(spec: DataViewSpec): Promise<DataViewLazy>;
	/**
	 * Create a new data view lazy and save it right away.
	 * @param spec data view spec
	 * @param override Overwrite if existing index pattern exists.
	 */
	createAndSaveDataViewLazy(spec: DataViewSpec, overwrite?: boolean): Promise<DataViewLazy>;
	/**
	 * Create a new data view and save it right away.
	 * @param spec data view spec
	 * @param override Overwrite if existing index pattern exists.
	 * @param skipFetchFields Whether to skip field refresh step.
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	createAndSave(spec: DataViewSpec, overwrite?: boolean, skipFetchFields?: boolean, displayErrors?: boolean): Promise<DataView$1>;
	/**
	 * Save a new data view.
	 * @param dataView data view instance
	 * @param override Overwrite if existing index pattern exists
	 */
	createSavedObject(dataView: AbstractDataView, overwrite?: boolean): Promise<void>;
	/**
	 * Save existing data view. Will attempt to merge differences if there are conflicts.
	 * @param indexPattern
	 * @param saveAttempts
	 * @param ignoreErrors
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	updateSavedObject(indexPattern: AbstractDataView, saveAttempts?: number, ignoreErrors?: boolean, displayErrors?: boolean): Promise<void>;
	/**
	 * Deletes an index pattern from .kibana index.
	 * @param indexPatternId: Id of kibana Index Pattern to delete
	 */
	delete(indexPatternId: string): Promise<void>;
	private getDefaultDataViewId;
	/**
	 * Returns whether a default data view exists.
	 */
	defaultDataViewExists(): Promise<boolean>;
	/**
	 * Returns the default data view as a DataViewLazy.
	 * If no default is found, or it is missing
	 * another data view is selected as default and returned.
	 * If no possible data view found to become a default returns null.
	 *
	 * @returns default data view lazy
	 */
	getDefaultDataViewLazy(): Promise<DataViewLazy | null>;
	/**
	 * Returns the default data view as an object.
	 * If no default is found, or it is missing
	 * another data view is selected as default and returned.
	 * If no possible data view found to become a default returns null.
	 *
	 * @param {Object} options
	 * @param {boolean} options.refreshFields - If true, will refresh the fields of the default data view
	 * @param {boolean} [options.displayErrors=true] - If set false, API consumer is responsible for displaying and handling errors.
	 * @returns default data view
	 */
	getDefaultDataView(options?: {
		displayErrors?: boolean;
		refreshFields?: boolean;
	}): Promise<DataView$1 | null>;
	toDataView(dataViewLazy: DataViewLazy): Promise<DataView$1>;
	toDataViewLazy(dataView: DataView$1): Promise<DataViewLazy>;
}
declare class DatatableUtilitiesService {
	private aggs;
	private dataViews;
	private fieldFormats;
	constructor(aggs: AggsCommonStart, dataViews: DataViewsContract, fieldFormats: FieldFormatsStartCommon);
	clearField(column: DatatableColumn): void;
	clearFieldFormat(column: DatatableColumn): void;
	getAggConfig(column: DatatableColumn): Promise<AggConfig | undefined>;
	/**
	 * Helper function returning the used interval, used time zone and applied time filters for data table column created by the date_histogramm agg type.
	 * "auto" will get expanded to the actually used interval.
	 * If the column is not a column created by a date_histogram aggregation of the esaggs data source,
	 * this function will return undefined.
	 */
	getDateHistogramMeta(column: DatatableColumn, defaults?: Partial<{
		timeZone: string;
	}>): DateHistogramMeta | undefined;
	getDataView(column: DatatableColumn): Promise<DataView$1 | undefined>;
	getField(column: DatatableColumn): Promise<DataViewField | undefined>;
	getFieldFormat(column: DatatableColumn): FieldFormat | undefined;
	getInterval(column: DatatableColumn): string | undefined;
	/**
	 * Helper function returning the used interval for data table column created by the histogramm agg type.
	 * "auto" will get expanded to the actually used interval.
	 * If the column is not a column created by a histogram aggregation of the esaggs data source,
	 * this function will return undefined.
	 */
	getNumberHistogramInterval(column: DatatableColumn): number | undefined;
	getTotalCount(table: Datatable): number | undefined;
	hasPrecisionError(column: DatatableColumn): Serializable;
	isFilterable(column: DatatableColumn): boolean;
	setFieldFormat(column: DatatableColumn, fieldFormat: FieldFormat): void;
}
declare class DevToolApp {
	/**
	 * The id of the dev tools. This will become part of the URL path
	 * (`dev_tools/${devTool.id}`. It has to be unique among registered
	 * dev tools.
	 */
	readonly id: string;
	/**
	 * The human readable name of the dev tool. Should be internationalized.
	 * This will be used as a label in the tab above the actual tool.
	 * May also be a ReactNode.
	 */
	readonly title: string;
	readonly mount: (params: DevToolMountParams) => AppUnmount | Promise<AppUnmount>;
	/**
	 * Mark the navigation tab as beta.
	 */
	readonly isBeta?: boolean;
	/**
	 * Flag indicating to disable the tab of this dev tool. Navigating to a
	 * disabled dev tool will be treated as the navigation to an unknown route
	 * (redirect to the console).
	 */
	private disabled;
	/**
	 * Optional tooltip content of the tab.
	 */
	readonly tooltipContent?: string;
	/**
	 * Flag indicating whether the dev tool will do routing within the `dev_tools/${devTool.id}/`
	 * prefix. If it is set to true, the dev tool is responsible to redirect
	 * the user when navigating to unknown URLs within the prefix. If set
	 * to false only the root URL of the dev tool will be recognized as valid.
	 */
	readonly enableRouting: boolean;
	/**
	 * Number used to order the tabs.
	 */
	readonly order: number;
	constructor(id: string, title: string, mount: (params: DevToolMountParams) => AppUnmount | Promise<AppUnmount>, enableRouting: boolean, order: number, toolTipContent?: string, disabled?: boolean, isBeta?: boolean);
	enable(): void;
	disable(): void;
	isDisabled(): boolean;
}
declare class EnvironmentService {
	private environment;
	setup(): {
		/**
		 * Update the environment to influence how the home app is presenting available features.
		 * This API should not be extended for new features and will be removed in future versions
		 * in favor of display specific extension apis.
		 * @deprecated
		 * @removeBy 8.8.0
		 * @param update
		 */
		update: (update: Partial<Environment>) => void;
	};
	getEnvironment(): {
		cloud: boolean;
		apmUi: boolean;
		ml: boolean;
	};
}
declare class FeatureCatalogueRegistry {
	private capabilities;
	private solutions;
	private featuresSubject;
	setup(): {
		register: (feature: FeatureCatalogueEntry) => void;
		registerSolution: (solution: FeatureCatalogueSolution) => void;
	};
	start({ capabilities }: {
		capabilities: Capabilities;
	}): void;
	/**
	 * @deprecated
	 * Use getFeatures$() instead
	 */
	get(features?: Map<string, FeatureCatalogueEntry>): FeatureCatalogueEntry[];
	getFeatures$(): Observable<FeatureCatalogueEntry[]>;
	getSolutions(): FeatureCatalogueSolution[];
	removeFeature(appId: string): void;
}
declare class FieldFormatsRegistry {
	protected fieldFormats: Map<FieldFormatId, FieldFormatInstanceType>;
	protected defaultMap: Record<string, FieldFormatConfig>;
	protected metaParamsOptions: FieldFormatMetaParams;
	protected getConfig?: FieldFormatsGetConfigFn;
	deserialize: FormatFactory;
	init(getConfig: FieldFormatsGetConfigFn, metaParamsOptions?: FieldFormatMetaParams, defaultFieldConverters?: FieldFormatInstanceType[]): void;
	/**
	 * Get the id of the default type for this field type
	 * using the format:defaultTypeMap config map
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType - the field type
	 * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
	 * @return {FieldType}
	 */
	getDefaultConfig: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => FieldFormatConfig;
	/**
	 * Get a derived FieldFormat class by its id.
	 *
	 * @param  {FieldFormatId} formatId - the format id
	 * @return {FieldFormatInstanceType | undefined}
	 */
	getType: (formatId: FieldFormatId) => FieldFormatInstanceType | undefined;
	getTypeWithoutMetaParams: (formatId: FieldFormatId) => FieldFormatInstanceType | undefined;
	/**
	 * Get the default FieldFormat type (class) for
	 * a field type, using the format:defaultTypeMap.
	 * used by the field editor
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
	 * @return {FieldFormatInstanceType | undefined}
	 */
	getDefaultType: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => FieldFormatInstanceType | undefined;
	/**
	 * Get the name of the default type for ES types like date_nanos
	 * using the format:defaultTypeMap config map
	 *
	 * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
	 * @return {ES_FIELD_TYPES | undefined}
	 */
	getTypeNameByEsTypes: (esTypes: ES_FIELD_TYPES[] | undefined) => ES_FIELD_TYPES | undefined;
	/**
	 * Get the default FieldFormat type name for
	 * a field type, using the format:defaultTypeMap.
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @param  {ES_FIELD_TYPES[]} esTypes
	 * @return {ES_FIELD_TYPES | KBN_FIELD_TYPES}
	 */
	getDefaultTypeName: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]) => ES_FIELD_TYPES | KBN_FIELD_TYPES;
	/**
	 * Get the singleton instance of the FieldFormat type by its id.
	 *
	 * @param  {FieldFormatId} formatId
	 * @return {FieldFormat}
	 */
	getInstance: (formatId: FieldFormatId, params?: FieldFormatParams) => FieldFormat;
	private getInstanceMemoized;
	/**
	 * Get the default fieldFormat instance for a field format.
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @param  {ES_FIELD_TYPES[]} esTypes
	 * @return {FieldFormat}
	 */
	getDefaultInstancePlain: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[], params?: FieldFormatParams) => FieldFormat;
	/**
	 * Returns a cache key built by the given variables for caching in memoized
	 * Where esType contains fieldType, fieldType is returned
	 * -> kibana types have a higher priority in that case
	 * -> would lead to failing tests that match e.g. date format with/without esTypes
	 * https://lodash.com/docs#memoize
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @param  {ES_FIELD_TYPES[] | undefined} esTypes
	 * @return {String}
	 */
	getDefaultInstanceCacheResolver(fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]): string;
	/**
	 * Get filtered list of field formats by format type,
	 * Skips hidden field formats
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @return {FieldFormatInstanceType[]}
	 */
	getByFieldType(fieldType: KBN_FIELD_TYPES): FieldFormatInstanceType[];
	/**
	 * Get the default fieldFormat instance for a field format.
	 * It's a memoized function that builds and reads a cache
	 *
	 * @param  {KBN_FIELD_TYPES} fieldType
	 * @param  {ES_FIELD_TYPES[]} esTypes
	 * @param  {FieldFormatParams} params
	 * @return {FieldFormat}
	 */
	getDefaultInstance: (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[], params?: FieldFormatParams) => FieldFormat;
	private getDefaultInstanceMemoized;
	parseDefaultTypeMap(value: Record<string, FieldFormatConfig>): void;
	register(fieldFormats: FieldFormatInstanceType[]): void;
	/**
	 * Checks if field format with id already registered
	 * @param id
	 */
	has(id: string): boolean;
	/**
	 * FieldFormat decorator - provide a one way to add meta-params for all field formatters
	 *
	 * @internal
	 * @param  {FieldFormatInstanceType} fieldFormat - field format type
	 * @return {FieldFormatInstanceType | undefined}
	 */
	private fieldFormatMetaParamsDecorator;
	/**
	 * Build Meta Params
	 *
	 * @param  {FieldFormatParams} custom params
	 * @return {FieldFormatParams & FieldFormatMetaParams}
	 */
	private buildMetaParams;
}
declare class FilterManager implements PersistableStateService<Filter[]> {
	private filters;
	private updated$;
	private fetch$;
	private uiSettings;
	constructor(uiSettings: IUiSettingsClient);
	private mergeIncomingFilters;
	private static mergeFilters;
	private static partitionFilters;
	private handleStateUpdate;
	getFilters(): Filter[];
	getAppFilters(): Filter[];
	getGlobalFilters(): Filter[];
	getPartitionedFilters(): PartitionedFilters;
	getUpdates$(): import("rxjs").Observable<void>;
	getFetches$(): import("rxjs").Observable<void>;
	addFilters(filters: Filter[] | Filter, pinFilterStatus?: boolean): void;
	setFilters(newFilters: Filter[], pinFilterStatus?: boolean): void;
	/**
	 * Sets new global filters and leaves app filters untouched,
	 * Removes app filters for which there is a duplicate within new global filters
	 * @param newGlobalFilters
	 */
	setGlobalFilters(newGlobalFilters: Filter[]): void;
	/**
	 * Sets new app filters and leaves global filters untouched,
	 * Removes app filters for which there is a duplicate within new global filters
	 * @param newAppFilters
	 */
	setAppFilters(newAppFilters: Filter[]): void;
	removeFilter(filter: Filter): void;
	removeAll(): void;
	static setFiltersStore(filters: Filter[], store: FilterStateStore, shouldOverrideStore?: boolean): void;
	extract: (filters: Filter[]) => {
		state: Filter[];
		references: SavedObjectReference[];
	};
	inject: (filters: Filter[], references: SavedObjectReference$1[]) => Filter[];
	telemetry: (filters: Filter[], collector: unknown) => {};
	getAllMigrations: () => MigrateFunctionsObject;
}
declare class Locator<P extends SerializableRecord> implements LocatorPublic<P> {
	readonly definition: LocatorDefinition<P>;
	protected readonly deps: LocatorDependencies;
	readonly id: string;
	readonly migrations: PersistableState<P>["migrations"];
	constructor(definition: LocatorDefinition<P>, deps: LocatorDependencies);
	readonly telemetry: PersistableState<P>["telemetry"];
	readonly inject: PersistableState<P>["inject"];
	readonly extract: PersistableState<P>["extract"];
	getLocation(params: P): Promise<KibanaLocation>;
	getUrl(params: P, { absolute }?: LocatorGetUrlParams): Promise<string>;
	getRedirectUrl(params: P, options?: GetRedirectUrlOptions): string;
	navigate(params: P, { replace }?: LocatorNavigationParams): Promise<void>;
	navigateSync(locatorParams: P, navigationParams?: LocatorNavigationParams): void;
	readonly useUrl: (params: P, getUrlParams?: LocatorGetUrlParams, deps?: React$1.DependencyList) => string;
}
declare class LocatorClient implements ILocatorClient {
	protected readonly deps: LocatorClientDependencies;
	/**
	 * Collection of registered locators.
	 */
	protected locators: Map<string, Locator<any>>;
	constructor(deps: LocatorClientDependencies);
	/**
	 * Creates and register a URL locator.
	 *
	 * @param definition A definition of URL locator.
	 * @returns A public interface of URL locator.
	 */
	create<P extends SerializableRecord>(definition: LocatorDefinition<P>): LocatorPublic<P>;
	/**
	 * Returns a previously registered URL locator.
	 *
	 * @param id ID of a URL locator.
	 * @returns A public interface of a registered URL locator.
	 */
	get<P extends SerializableRecord>(id: string): undefined | LocatorPublic<P>;
	readonly useUrl: <P extends SerializableRecord>(params: () => {
		id: string;
		params: P;
	}, deps?: React$1.DependencyList, getUrlParams?: LocatorGetUrlParams) => string | undefined;
	protected getOrThrow<P extends SerializableRecord>(id: string): LocatorPublic<P>;
	migrations(): {
		[locatorId: string]: MigrateFunctionsObject;
	};
	telemetry(state: LocatorData, collector: Record<string, unknown>): Record<string, unknown>;
	inject(state: LocatorData, references: SavedObjectReference[]): LocatorData;
	extract(state: LocatorData): {
		state: LocatorData;
		references: SavedObjectReference[];
	};
	readonly getAllMigrations: () => LocatorsMigrationMap;
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
declare class MetricAggType<TMetricAggConfig extends AggConfig = IMetricAggConfig> extends AggType<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
	subtype: string;
	isScalable: () => boolean;
	type: string;
	getKey: () => void;
	constructor(config: MetricAggTypeConfig<TMetricAggConfig>);
}
declare class NowProvider {
	private readonly nowFromUrl;
	private now?;
	constructor();
	get(): Date;
	set(now: Date): void;
	reset(): void;
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
declare class QueryStringManager {
	private readonly storage;
	private readonly uiSettings;
	private query$;
	constructor(storage: IStorageWrapper, uiSettings: CoreStart["uiSettings"]);
	private getDefaultLanguage;
	getDefaultQuery(): {
		query: string;
		language: any;
	};
	formatQuery(query: Query | AggregateQuery | string | undefined): Query | AggregateQuery;
	getUpdates$: () => import("rxjs").Observable<Query | AggregateQuery>;
	getQuery: () => Query | AggregateQuery;
	/**
	 * Updates the query.
	 * @param {Query | AggregateQuery} query
	 */
	setQuery: (query: Query | AggregateQuery) => void;
	/**
	 * Resets the query to the default one.
	 */
	clearQuery: () => void;
}
declare class Reference<T> {
	static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V>;
	private readonly internalSchema;
	constructor(key: string);
	getSchema(): InternalReference;
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
declare class SearchSessionEBTManager {
	private reportEventCore;
	private logger;
	constructor({ core, logger }: {
		core: CoreSetup;
		logger: Logger;
	});
	private reportEvent;
	trackBgsStarted({ entryPoint, session, }: {
		entryPoint: string;
		session: SearchSessionSavedObject;
	}): void;
	trackBgsCompleted({ response, session, }: {
		response: IKibanaSearchResponse<SearchResponse> | IKibanaSearchResponse<ESQLSearchResponse>;
		session: SearchSessionSavedObject;
	}): void;
	trackBgsError({ session, error }: {
		session: SearchSessionSavedObject;
		error: Error;
	}): void;
	trackBgsCancelled({ session, cancelSource, }: {
		session: SearchSessionSavedObject;
		cancelSource: string;
	}): void;
	trackBgsOpened({ session, resumeSource }: {
		session: UISession;
		resumeSource: string;
	}): void;
	trackBgsListView({ entryPoint }: {
		entryPoint: string;
	}): void;
	private getHttpStatus;
	private getResultsCount;
	private getQueryLanguage;
	private getQueryString;
	private getQueryStringCharCount;
	private getQueryStringLineCount;
}
declare class SearchSource {
	private id;
	private shouldOverwriteDataViewType;
	private overwriteDataViewType?;
	private parent?;
	private requestStartHandlers;
	private inheritOptions;
	history: SearchRequest[];
	private fields;
	private readonly dependencies;
	constructor(fields: SearchSourceFields | undefined, dependencies: SearchSourceDependencies);
	/** ***
	 * PUBLIC API
	 *****/
	/**
	 * Used to make the search source overwrite the actual data view type for the
	 * specific requests done. This should only be needed very rarely, since it means
	 * e.g. we'd be treating a rollup index pattern as a regular one. Be very sure
	 * you understand the consequences of using this method before using it.
	 *
	 * @param overwriteType If `false` is passed in it will disable the overwrite, otherwise
	 *    the passed in value will be used as the data view type for this search source.
	 */
	setOverwriteDataViewType(overwriteType: string | undefined | false): void;
	/**
	 * sets value to a single search source field
	 * @param field: field name
	 * @param value: value for the field
	 */
	setField<K extends keyof SearchSourceFields>(field: K, value: SearchSourceFields[K]): this;
	/**
	 * remove field
	 * @param field: field name
	 */
	removeField<K extends keyof SearchSourceFields>(field: K): this;
	/**
	 * Internal, do not use. Overrides all search source fields with the new field array.
	 *
	 * @internal
	 * @param newFields New field array.
	 */
	private setFields;
	/**
	 * returns search source id
	 */
	getId(): string;
	/**
	 * returns all search source fields
	 */
	getFields(): SearchSourceFields;
	/**
	 * Gets a single field from the fields
	 */
	getField<K extends keyof SearchSourceFields>(field: K, recurse?: boolean): SearchSourceFields[K];
	getActiveIndexFilter(): any[];
	/**
	 * Get the field from our own fields, don't traverse up the chain
	 */
	getOwnField<K extends keyof SearchSourceFields>(field: K): SearchSourceFields[K];
	/**
	 * @deprecated Don't use.
	 */
	create(): SearchSource;
	/**
	 * creates a copy of this search source (without its children)
	 */
	createCopy(): SearchSource;
	/**
	 * creates a new child search source
	 * @param options
	 */
	createChild(options?: {}): SearchSource;
	/**
	 * Set a searchSource that this source should inherit from
	 * @param  {SearchSource} parent - the parent searchSource
	 * @param  {SearchSourceOptions} options - the inherit options
	 */
	setParent(parent?: ISearchSource, options?: SearchSourceOptions): this;
	/**
	 * Get the parent of this SearchSource
	 */
	getParent(): SearchSource | undefined;
	/**
	 * Fetch this source from Elasticsearch, returning an observable over the response(s)
	 * @param options
	 */
	fetch$<T = {}>(options?: SearchSourceSearchOptions): Observable<IKibanaSearchResponse<estypes.SearchResponse<T>>>;
	/**
	 * Fetch this source and reject the returned Promise on error
	 * @deprecated Use the `fetch$` method instead
	 */
	fetch(options?: SearchSourceSearchOptions): Promise<estypes.SearchResponse<unknown, Record<string, estypes.AggregationsAggregate>>>;
	/**
	 *  Add a handler that will be notified whenever requests start
	 *  @param  {Function} handler
	 */
	onRequestStart(handler: (searchSource: SearchSource, options?: SearchSourceSearchOptions) => Promise<unknown>): void;
	/**
	 * Returns body contents of the search request, often referred as query DSL.
	 */
	getSearchRequestBody(): any;
	/**
	 * Completely destroy the SearchSource.
	 */
	destroy(): void;
	/** ****
	 * PRIVATE APIS
	 ******/
	private inspectSearch;
	private hasPostFlightRequests;
	private postFlightTransform;
	private fetchOthers;
	/**
	 * Run a search using the search service
	 */
	private fetchSearch$;
	/**
	 *  Called by requests of this search source when they are started
	 *  @param options
	 */
	private requestIsStarting;
	/**
	 * Used to merge properties into the data within ._flatten().
	 * The data is passed in and modified by the function
	 *
	 * @param  {object} data - the current merged data
	 * @param  {*} val - the value at `key`
	 * @param  {*} key - The key of `val`
	 */
	private mergeProp;
	/**
	 * Walk the inheritance chain of a source and return its
	 * flat representation (taking into account merging rules)
	 * @resolved {Object|null} - the flat data of the SearchSource
	 */
	private mergeProps;
	private getIndexType;
	private getDataView;
	private readonly getFieldName;
	private getFieldsWithoutSourceFilters;
	private getFieldFromDocValueFieldsOrIndexPattern;
	loadDataViewFields(dataView: DataViewLazy): Promise<Record<string, DataViewField>>;
	private flatten;
	private getFieldFilter;
	private getUniqueFieldNames;
	private filterScriptFields;
	private getBuiltEsQuery;
	private getRemainingFields;
	private getFieldsList;
	private getUniqueFields;
	/**
	 * serializes search source fields (which can later be passed to {@link ISearchStartSearchSource})
	 */
	getSerializedFields(recurse?: boolean): SerializedSearchSourceFields;
	/**
	 * Serializes the instance to a JSON string and a set of referenced objects.
	 * Use this method to get a representation of the search source which can be stored in a saved object.
	 *
	 * The references returned by this function can be mixed with other references in the same object,
	 * however make sure there are no name-collisions. The references will be named `kibanaSavedObjectMeta.searchSourceJSON.index`
	 * and `kibanaSavedObjectMeta.searchSourceJSON.filter[<number>].meta.index`.
	 *
	 * Using `createSearchSource`, the instance can be re-created.
	 * @public */
	serialize(): {
		searchSourceJSON: string;
		references: SavedObjectReference[];
	};
	private getFilters;
	/**
	 * Generates an expression abstract syntax tree using the fields set in the current search source and its ancestors.
	 * The produced expression from the returned AST will return the `datatable` structure.
	 * If the `asDatatable` option is truthy or omitted, the generator will use the `esdsl` function to perform the search.
	 * When the `aggs` field is present, it will use the `esaggs` function instead.
	 */
	toExpressionAst({ asDatatable }?: ExpressionAstOptions): ExpressionAstExpression;
	parseActiveIndexPatternFromQueryString(queryString: string): string[];
}
declare class SessionService {
	private readonly sessionsClient;
	private readonly nowProvider;
	readonly state$: Observable<SearchSessionState>;
	private readonly state;
	readonly sessionMeta$: Observable<SessionMeta>;
	private searchSessionInfoProvider?;
	private searchSessionIndicatorUiConfig?;
	private subscription;
	private currentApp?;
	private hasAccessToSearchSessions;
	private toastService?;
	private searchSessionEBTManager?;
	private sessionSnapshots;
	private logger;
	constructor(initializerContext: PluginInitializerContext<ConfigSchema$1>, getStartServices: StartServicesAccessor, searchSessionEBTManager: ISearchSessionEBTManager, sessionsClient: ISessionsClient, nowProvider: NowProviderInternalContract, { freezeState }?: {
		freezeState: boolean;
	});
	/**
	 * If user has access to search sessions
	 * This resolves to `true` in case at least one app allows user to create search session
	 * In this case search session management is available
	 */
	hasAccess(): boolean;
	/**
	 * Used to track searches within current session
	 *
	 * @param searchDescriptor - uniq object that will be used to as search identifier
	 * @returns {@link TrackSearchHandler}
	 */
	trackSearch(searchDescriptor: TrackSearchDescriptor): TrackSearchHandler;
	destroy(): void;
	/**
	 * Get current session id
	 */
	getSessionId(): string | undefined;
	/**
	 * Get observable for current session id
	 */
	getSession$(): Observable<string | undefined>;
	/**
	 * Is current session in process of saving
	 */
	isSaving(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
	/**
	 * Is current session already saved as SO (send to background)
	 */
	isStored(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
	/**
	 * Is restoring the older saved searches
	 */
	isRestore(state?: SessionStateContainer<TrackSearchDescriptor, TrackSearchMeta>): boolean;
	/**
	 * Start a new search session
	 * @returns sessionId
	 */
	start(): string;
	/**
	 * Restore previously saved search session
	 * @param sessionId
	 */
	restore(sessionId: string): Promise<void>;
	/**
	 * Continue previous search session
	 * Can be used to restore all the information of a previous search session after a new one has been started. It is useful
	 * to continue a session in different apps or across different discover tabs.
	 *
	 * This is different from {@link restore} as it reuses search session state and search results held in client memory instead of restoring search results from elasticsearch
	 * @param sessionId
	 * @param keepSearches indicates if restoring the session also restores the tracked searches or starts with an empty tracking list
	 */
	continue(sessionId: string, keepSearches?: boolean): void;
	/**
	 * Resets the current search session state.
	 * Can be used to reset to a default state without clearing initialization info, such as when switching between discover tabs.
	 *
	 * This is different from {@link clear} as it does not reset initialization info set through {@link enableStorage}.
	 */
	reset(): void;
	private storeSessionSnapshot;
	/**
	 * Cleans up current state
	 */
	clear(): void;
	/**
	 * Request a cancellation of on-going search requests within current session
	 */
	cancel({ source }: {
		source: string;
	}): Promise<void>;
	/**
	 * Save current session as SO to get back to results later
	 * (Send to background)
	 */
	save(trackingProps: {
		entryPoint: string;
	}): Promise<SearchSessionSavedObject>;
	/**
	 * Change user-facing name of a current session
	 * Doesn't throw in case of API error but presents a notification toast instead
	 * @param newName - new session name
	 */
	renameCurrentSession(newName: string): Promise<void>;
	/**
	 * Checks if passed sessionId is a current sessionId
	 * @param sessionId
	 */
	isCurrentSession(sessionId?: string): boolean;
	/**
	 * Infers search session options for sessionId using current session state
	 *
	 * In case user doesn't has access to `search-session` SO returns null,
	 * meaning that sessionId and other session parameters shouldn't be used when doing searches
	 *
	 * @param sessionId
	 */
	getSearchOptions(sessionId?: string): Required<Pick<ISearchOptions, "sessionId" | "isRestore" | "isStored">> | null;
	/**
	 * Provide an info about current session which is needed for storing a search session.
	 * To opt-into "Search session indicator" UI app has to call {@link enableStorage}.
	 *
	 * @param searchSessionInfoProvider - info provider for saving a search session
	 * @param searchSessionIndicatorUiConfig - config for "Search session indicator" UI
	 */
	enableStorage<P extends SerializableRecord>(searchSessionInfoProvider: SearchSessionInfoProvider<P>, searchSessionIndicatorUiConfig?: SearchSessionIndicatorUiConfig): void;
	/**
	 * If the current app explicitly called {@link enableStorage} and provided all configuration needed
	 * for storing its search sessions
	 */
	isSessionStorageReady(): boolean;
	getSearchSessionIndicatorUiConfig(): SearchSessionIndicatorUiConfig;
	private refreshSearchSessionSavedObject;
}
declare class SessionsClient {
	private readonly http;
	constructor(deps: SessionsClientDeps);
	get(sessionId: string): Promise<SearchSessionSavedObject>;
	create({ name, appId, locatorId, initialState, restoreState, sessionId, }: {
		name: string;
		appId: string;
		locatorId: string;
		initialState: Record<string, unknown>;
		restoreState: Record<string, unknown>;
		sessionId: string;
	}): Promise<SearchSessionSavedObject>;
	find(opts: Omit<SavedObjectsFindOptions, "type">): Promise<SearchSessionsFindResponse>;
	update(sessionId: string, attributes: unknown): Promise<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>>;
	rename(sessionId: string, newName: string): Promise<void>;
	extend(sessionId: string, expires: string): Promise<void>;
	delete(sessionId: string): Promise<void>;
}
declare class ShareMenuManager {
	private isOpen;
	private container;
	start({ core, resolveShareItemsForShareContext, isServerless }: ShareMenuManagerStartDeps): {
		/**
		 * Collects share menu items from registered providers and mounts the share context menu under
		 * the given `anchorElement`. If the context menu is already opened, a call to this method closes it.
		 * @param options
		 */
		toggleShareContextMenu: (options: ShowShareMenuOptions) => Promise<void>;
	};
	private onClose;
	private toggleShareContextMenu;
}
declare class ShareRegistry implements ShareRegistryPublicApi {
	private urlService?;
	private anonymousAccessServiceProvider?;
	private capabilities?;
	private getLicense?;
	private readonly globalMarker;
	constructor();
	private readonly shareOptionsStore;
	setup(): {
		/**
		 * @deprecated Use {@link registerShareIntegration} instead.
		 */
		register: (value: ShareMenuProviderLegacy) => void;
		registerShareIntegration: <I extends ShareIntegration>(...args: [
			string,
			RegisterShareIntegrationArgs<I>
		] | [
			RegisterShareIntegrationArgs<I>
		]) => void;
	};
	start({ urlService, anonymousAccessServiceProvider, capabilities, getLicense, }: ShareRegistryApiStart): {
		availableIntegrations: (objectType: string, groupId?: string) => ShareActionIntents[];
		resolveShareItemsForShareContext: ({ objectType, isServerless, ...shareContext }: ShareContext & {
			isServerless: boolean;
		}) => Promise<ShareConfigs[]>;
	};
	private registerShareIntentAction;
	private registerLinkShareAction;
	private registerEmbedShareAction;
	/**
	 * @description provides an escape hatch to support allowing legacy share menu items to be registered
	 */
	private register;
	private registerShareIntegration;
	private getShareConfigOptionsForObject;
	/**
	 * Returns all share actions that are available for the given object type.
	 */
	private availableIntegrations;
	private resolveShareItemsForShareContext;
}
declare class TimeHistory {
	private history;
	constructor(storage: IStorageWrapper);
	add(time: TimeRange): void;
	get(): TimeRange[];
	get$(): import("rxjs").Observable<TimeRange[]>;
}
declare class Timefilter {
	private readonly nowProvider;
	private enabledUpdated$;
	private timeUpdate$;
	private refreshIntervalUpdate$;
	private fetch$;
	private _time;
	private _isTimeTouched;
	private _refreshInterval;
	private _minRefreshInterval;
	private _isRefreshIntervalTouched;
	private _history;
	private _isTimeRangeSelectorEnabled;
	private _isAutoRefreshSelectorEnabled;
	private readonly timeDefaults;
	private readonly refreshIntervalDefaults;
	readonly useTimefilter: () => TimefilterHook;
	private readonly autoRefreshLoop;
	constructor(config: TimefilterConfig, timeHistory: TimeHistoryContract, nowProvider: NowProviderInternalContract);
	isTimeRangeSelectorEnabled(): boolean;
	isAutoRefreshSelectorEnabled(): boolean;
	isTimeTouched(): boolean;
	isRefreshIntervalTouched(): boolean;
	getEnabledUpdated$: () => import("rxjs").Observable<boolean>;
	getTimeUpdate$: () => import("rxjs").Observable<void>;
	getRefreshIntervalUpdate$: () => import("rxjs").Observable<void>;
	/**
	 * Get an observable that emits when it is time to refetch data due to refresh interval
	 * Each subscription to this observable resets internal interval
	 * Emitted value is a callback {@link AutoRefreshDoneFn} that must be called to restart refresh interval loop
	 * Apps should use this callback to start next auto refresh loop when view finished updating
	 */
	getAutoRefreshFetch$: () => import("rxjs").Observable<AutoRefreshDoneFn>;
	triggerFetch: () => void;
	getFetch$: () => import("rxjs").Observable<void>;
	getTime: () => TimeRange;
	/**
	 * Same as {@link getTime}, but also converts relative time range to absolute time range
	 */
	getAbsoluteTime(): TimeRange;
	/**
	 * Updates timefilter time.
	 * Emits 'timeUpdate' and 'fetch' events when time changes
	 * @param {Object} time
	 * @property {string|moment} time.from
	 * @property {string|moment} time.to
	 */
	setTime: (time: InputTimeRange) => void;
	getRefreshInterval: () => Readonly<{} & {
		value: number;
		pause: boolean;
	}>;
	getMinRefreshInterval: () => number;
	/**
	 * Set timefilter refresh interval.
	 * @param {Object} refreshInterval
	 * @property {number} time.value Refresh interval in milliseconds. Positive integer
	 * @property {boolean} time.pause
	 */
	setRefreshInterval: (refreshInterval: Partial<RefreshInterval>) => void;
	/**
	 * Create a time filter that coerces all time values to absolute time.
	 *
	 * This is useful for creating a filter that ensures all ES queries will fetch the exact same data
	 * and leverages ES query cache for performance improvement.
	 *
	 * One use case is keeping different elements embedded in the same UI in sync.
	 */
	createFilter: (indexPattern: DataView$1, timeRange?: TimeRange) => ScriptedRangeFilter | MatchAllRangeFilter | RangeFilter | undefined;
	/**
	 * Create a time filter that converts only absolute time to ISO strings, it leaves relative time
	 * values unchanged (e.g. "now-1").
	 *
	 * This is useful for sending datemath values to ES endpoints to generate reports over time.
	 *
	 * @note Consumers of this function need to ensure that the ES endpoint supports datemath.
	 */
	createRelativeFilter: (indexPattern: DataView$1, timeRange?: TimeRange) => ScriptedRangeFilter | MatchAllRangeFilter | RangeFilter | undefined;
	getBounds(): TimeRangeBounds;
	calculateBounds(timeRange: TimeRange): TimeRangeBounds;
	getActiveBounds(): TimeRangeBounds | undefined;
	/**
	 * Show the time bounds selector part of the time filter
	 */
	enableTimeRangeSelector: () => void;
	/**
	 * Hide the time bounds selector part of the time filter
	 */
	disableTimeRangeSelector: () => void;
	/**
	 * Show the auto refresh part of the time filter
	 */
	enableAutoRefreshSelector: () => void;
	/**
	 * Hide the auto refresh part of the time filter
	 */
	disableAutoRefreshSelector: () => void;
	getTimeDefaults(): TimeRange;
	getRefreshIntervalDefaults(): RefreshInterval;
}
declare class TutorialService {
	private tutorialVariables;
	private tutorialDirectoryHeaderLinks;
	private tutorialModuleNotices;
	private customStatusCheck;
	private customComponent;
	setup(): {
		/**
		 * Set a variable usable in tutorial templates. Access with `{config.<key>}`.
		 */
		setVariable: (key: string, value: unknown) => void;
		/**
		 * Registers a component that will be rendered next to tutorial directory title/header area.
		 */
		registerDirectoryHeaderLink: (id: string, component: TutorialDirectoryHeaderLinkComponent) => void;
		/**
		 * Registers a component that will be rendered in the description of a tutorial that is associated with a module.
		 */
		registerModuleNotice: (id: string, component: TutorialModuleNoticeComponent) => void;
		registerCustomStatusCheck: (name: string, fnCallback: CustomStatusCheckCallback) => void;
		registerCustomComponent: (name: string, component: CustomComponent) => void;
	};
	getVariables(): Partial<Record<string, unknown>>;
	getDirectoryHeaderLinks(): TutorialDirectoryHeaderLinkComponent[];
	getModuleNotices(): TutorialModuleNoticeComponent[];
	getCustomStatusCheck(customStatusCheckName: string): CustomStatusCheckCallback;
	getCustomComponent(customComponentName: string): CustomComponent;
}
declare class UrlForwardingPlugin {
	private forwardDefinitions;
	setup(core: CoreSetup<{}, UrlForwardingStart>): {
		/**
		 * Forwards URLs within the legacy `kibana` app to a new platform application.
		 *
		 * @param legacyAppId The name of the old app to forward URLs from
		 * @param newAppId The name of the new app that handles the URLs now
		 * @param rewritePath Function to rewrite the legacy sub path of the app to the new path in the core app.
		 *        If none is provided, it will just strip the prefix of the legacyAppId away
		 *
		 * path into the new path
		 *
		 * Example usage:
		 * ```
		 * urlForwarding.forwardApp(
		 *   'old',
		 *   'new',
		 *   path => {
		 *     const [, id] = /old/item\/(.*)$/.exec(path) || [];
		 *     if (!id) {
		 *       return '#/home';
		 *     }
		 *     return '#/items/${id}';
		 *  }
		 * );
		 * ```
		 * This will cause the following redirects:
		 *
		 * * app/kibana#/old/ -> app/new#/home
		 * * app/kibana#/old/item/123 -> app/new#/items/123
		 *
		 */
		forwardApp: (legacyAppId: string, newAppId: string, rewritePath?: (legacyPath: string) => string) => void;
	};
	start({ application, http: { basePath } }: CoreStart): {
		/**
		 * Resolves the provided hash using the registered forwards and navigates to the target app.
		 * If a navigation happened, `{ navigated: true }` will be returned.
		 * If no matching forward is found, `{ navigated: false }` will be returned.
		 * @param hash
		 */
		navigateToLegacyKibanaUrl: (hash: string) => {
			navigated: boolean;
		};
		/**
		 * @deprecated
		 * Just exported for wiring up with legacy platform, should not be used.
		 */
		getForwards: () => ForwardDefinition[];
	};
}
declare class UrlService<D = unknown, ShortUrlClient extends IShortUrlClient = IShortUrlClient> {
	protected readonly deps: UrlServiceDependencies<D, ShortUrlClient>;
	/**
	 * Client to work with locators.
	 */
	readonly locators: LocatorClient;
	readonly shortUrls: IShortUrlClientFactory<D, ShortUrlClient>;
	constructor(deps: UrlServiceDependencies<D, ShortUrlClient>);
}
declare class WelcomeService {
	private readonly onRenderedHandlers;
	private renderTelemetryNoticeHandler?;
	setup: () => WelcomeServiceSetup;
	onRendered: () => void;
	renderTelemetryNotice: () => JSX.Element | null;
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
declare const KIBANA_PRODUCT_TIERS: {
	readonly observability: readonly [
		"complete",
		"logs_essentials"
	];
	readonly security: readonly [
		"complete",
		"essentials",
		"search_ai_lake"
	];
	readonly search: readonly [
	];
	readonly workplaceai: readonly [
	];
};
declare const KIBANA_PROJECTS: readonly [
	"oblt",
	"security",
	"es",
	"workplaceai"
];
declare const KIBANA_SOLUTIONS: readonly [
	"observability",
	"security",
	"search",
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
declare const RUNTIME_FIELD_TYPES: readonly [
	"keyword",
	"long",
	"double",
	"date",
	"ip",
	"boolean",
	"geo_point",
	"composite"
];
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
declare const configSchema$1: ObjectType<{
	query: ObjectType<{
		/**
		 * Config for timefilter
		 */
		timefilter: ObjectType<{
			/**
			 * Lower limit of refresh interval (in milliseconds)
			 */
			minRefreshInterval: ConditionalType<true, number, number>;
		}>;
	}>;
	search: ObjectType<{
		/**
		 * Config for search strategies that use async search based API underneath
		 */
		asyncSearch: ObjectType<{
			/**
			 *  Block and wait until the search is completed up to the timeout (see es async_search's `wait_for_completion_timeout`)
			 *  TODO: we should optimize this as 100ms is likely not optimal (https://github.com/elastic/kibana/issues/143277)
			 */
			waitForCompletion: Type<import("moment").Duration>;
			/**
			 *  How long the async search needs to be available after each search poll. Ongoing async searches and any saved search results are deleted after this period.
			 *  (see es async_search's `keep_alive`)
			 *  Note: This is applicable to the searches before the search session is saved.
			 *  After search session is saved `keep_alive` is extended using `data.search.sessions.defaultExpiration` config
			 */
			keepAlive: Type<import("moment").Duration>;
			/**
			 * Affects how often partial results become available, which happens whenever shard results are reduced (see es async_search's `batched_reduce_size`)
			 */
			batchedReduceSize: Type<number>;
			/**
			 * How long to wait before polling the async_search after the previous poll response.
			 * If not provided, then default dynamic interval with backoff is used.
			 */
			pollInterval: Type<number | undefined>;
		}>;
		aggs: ObjectType<{
			shardDelay: ObjectType<{
				enabled: Type<boolean>;
			}>;
		}>;
		sessions: ObjectType<{
			/**
			 * Turns the feature on \ off (incl. removing indicator and management screens)
			 */
			enabled: Type<boolean>;
			/**
			 * notTouchedTimeout controls how long user can save a session after all searches completed.
			 * The client continues to poll searches to keep the alive until this timeout hits
			 */
			notTouchedTimeout: Type<import("moment").Duration>;
			/**
			 * maxUpdateRetries controls how many retries we perform while attempting to save a search session
			 */
			maxUpdateRetries: Type<number>;
			/**
			 * defaultExpiration controls how long search sessions are valid for, until they are expired.
			 */
			defaultExpiration: Type<import("moment").Duration>;
			management: ObjectType<{
				/**
				 * maxSessions controls how many saved search sessions we load on the management screen.
				 */
				maxSessions: Type<number>;
				/**
				 * refreshInterval controls how often we refresh the management screen. 0s as duration means that auto-refresh is turned off.
				 */
				refreshInterval: Type<import("moment").Duration>;
				/**
				 * refreshTimeout controls the timeout for loading search sessions on mgmt screen
				 */
				refreshTimeout: Type<import("moment").Duration>;
				expiresSoonWarning: Type<import("moment").Duration>;
			}>;
		}>;
	}>;
	/**
	 * Turns on/off limit validations for the registered uiSettings.
	 */
	enableUiSettingsValidations: Type<boolean>;
}>;
declare const configSchema: ObjectType<{
	disableWelcomeScreen: Type<boolean>;
}>;
declare const createSavedQueryService: (http: HttpStart) => {
	isDuplicateTitle: (title: string, id?: string) => Promise<boolean>;
	createQuery: (attributes: SavedQueryAttributes, { overwrite }?: {
		overwrite?: boolean | undefined;
	}) => Promise<SavedQuery>;
	updateQuery: (id: string, attributes: SavedQueryAttributes) => Promise<SavedQuery>;
	findSavedQueries: (search?: string, perPage?: number, page?: number) => Promise<{
		total: number;
		queries: SavedQuery[];
	}>;
	getSavedQuery: (id: string) => Promise<SavedQuery>;
	deleteSavedQuery: (id: string) => Promise<{}>;
	getSavedQueryCount: () => Promise<number>;
};
declare const name$1 = "datatable";
declare const refreshIntervalSchema: ObjectType<{
	pause: Type<boolean>;
	value: Type<number>;
}>;
declare const validBodyOutput: readonly [
	"data",
	"stream"
];
declare enum ACTION {
	INSPECT = "inspect",
	EXTEND = "extend",
	DELETE = "delete",
	RENAME = "rename"
}
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
declare enum BooleanRelation {
	AND = "AND",
	OR = "OR"
}
declare enum ES_FIELD_TYPES {
	_ID = "_id",
	_INDEX = "_index",
	_SOURCE = "_source",
	_TYPE = "_type",
	STRING = "string",
	TEXT = "text",
	MATCH_ONLY_TEXT = "match_only_text",
	KEYWORD = "keyword",
	VERSION = "version",
	BOOLEAN = "boolean",
	OBJECT = "object",
	DATE = "date",
	DATE_NANOS = "date_nanos",
	DATE_RANGE = "date_range",
	GEO_POINT = "geo_point",
	GEO_SHAPE = "geo_shape",
	FLOAT = "float",
	HALF_FLOAT = "half_float",
	SCALED_FLOAT = "scaled_float",
	DOUBLE = "double",
	INTEGER = "integer",
	LONG = "long",
	SHORT = "short",
	UNSIGNED_LONG = "unsigned_long",
	AGGREGATE_METRIC_DOUBLE = "aggregate_metric_double",
	FLOAT_RANGE = "float_range",
	DOUBLE_RANGE = "double_range",
	INTEGER_RANGE = "integer_range",
	LONG_RANGE = "long_range",
	NESTED = "nested",
	BYTE = "byte",
	IP = "ip",
	IP_RANGE = "ip_range",
	ATTACHMENT = "attachment",
	TOKEN_COUNT = "token_count",
	MURMUR3 = "murmur3",
	HISTOGRAM = "histogram",
	EXPONENTIAL_HISTOGRAM = "exponential_histogram",
	TDIGEST = "tdigest"
}
declare enum FIELD_FORMAT_IDS {
	_SOURCE = "_source",
	BOOLEAN = "boolean",
	BYTES = "bytes",
	COLOR = "color",
	CURRENCY = "currency",
	CUSTOM = "custom",
	DATE = "date",
	DATE_NANOS = "date_nanos",
	DURATION = "duration",
	GEO_POINT = "geo_point",
	IP = "ip",
	NUMBER = "number",
	PERCENT = "percent",
	RELATIVE_DATE = "relative_date",
	STATIC_LOOKUP = "static_lookup",
	STRING = "string",
	TRUNCATE = "truncate",
	URL = "url",
	HISTOGRAM = "histogram"
}
declare enum FilterStateStore {
	APP_STATE = "appState",
	GLOBAL_STATE = "globalState"
}
declare enum KBN_FIELD_TYPES {
	_SOURCE = "_source",
	ATTACHMENT = "attachment",
	BOOLEAN = "boolean",
	DATE = "date",
	DATE_RANGE = "date_range",
	GEO_POINT = "geo_point",
	GEO_SHAPE = "geo_shape",
	IP = "ip",
	IP_RANGE = "ip_range",
	MURMUR3 = "murmur3",
	NUMBER = "number",
	NUMBER_RANGE = "number_range",
	STRING = "string",
	UNKNOWN = "unknown",
	CONFLICT = "conflict",
	OBJECT = "object",
	NESTED = "nested",
	HISTOGRAM = "histogram",
	EXPONENTIAL_HISTOGRAM = "exponential_histogram",
	TDIGEST = "tdigest",
	MISSING = "missing"
}
declare enum LICENSE_TYPE {
	basic = 10,
	standard = 20,
	gold = 30,
	platinum = 40,
	enterprise = 50,
	trial = 60
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
declare enum ResolveIndexResponseItemIndexAttrs {
	OPEN = "open",
	CLOSED = "closed",
	HIDDEN = "hidden",
	FROZEN = "frozen"
}
declare enum SearchSessionState {
	/**
	 * Session is not active, e.g. didn't start
	 */
	None = "none",
	/**
	 * Pending search request has not been sent to the background yet
	 */
	Loading = "loading",
	/**
	 * No action was taken and the page completed loading without search session creation.
	 */
	Completed = "completed",
	/**
	 * Search session was sent to the background.
	 * The page is loading in background.
	 */
	BackgroundLoading = "backgroundLoading",
	/**
	 * Page load completed with search session created.
	 */
	BackgroundCompleted = "backgroundCompleted",
	/**
	 * Revisiting the page after background completion
	 */
	Restored = "restored",
	/**
	 * Current session requests where explicitly canceled by user
	 * Displaying none or partial results
	 */
	Canceled = "canceled"
}
declare enum SearchSessionStatus {
	IN_PROGRESS = "in_progress",
	ERROR = "error",
	COMPLETE = "complete",
	CANCELLED = "cancelled",
	EXPIRED = "expired"
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
declare enum SortDirection {
	asc = "asc",
	desc = "desc"
}
declare enum TrackedSearchState {
	InProgress = "inProgress",
	Completed = "completed",
	Errored = "errored"
}
declare enum WorkflowsPageName {
	workflows = "workflows"
}
declare function buildEsQuery(indexPattern: DataViewBase | DataViewBase[] | undefined, queries: AnyQuery | AnyQuery[], filters: Filter | Filter[], config?: EsQueryConfig): {
	bool: BoolQuery;
};
declare function createAddToQueryLog({ storage, uiSettings }: AddToQueryLogDependencies): (appName: string, { language, query }: Query) => void;
declare function getCalculateAutoTimeExpression(getConfig: (key: string) => any): {
	(range: TimeRange$1): string | undefined;
	(range: TimeRange$1, interval: string, asExpression?: true): string | undefined;
	(range: TimeRange$1, interval: string, asExpression: false): TimeBucketsInterval | undefined;
	(range: TimeRange$1, interval?: string, asExpression?: boolean): string | TimeBucketsInterval | undefined;
};
export declare class ConsoleUIPlugin implements Plugin$1<ConsolePluginSetup, ConsolePluginStart, AppSetupUIPluginDependencies, AppPluginSetupDependencies> {
	private ctx;
	private readonly autocompleteInfo;
	private _embeddableConsole;
	constructor(ctx: PluginInitializerContext);
	setup({ notifications, getStartServices, http }: CoreSetup<AppPluginSetupDependencies>, { devTools, home, share, usageCollection }: AppSetupUIPluginDependencies): ConsolePluginSetup;
	start(core: CoreStart, deps: AppStartUIPluginDependencies): ConsolePluginStart;
}
interface AbsoluteTimeRange extends TimeRange {
	mode: "absolute";
}
interface AbstractDataViewDeps {
	spec?: DataViewSpec;
	fieldFormats: FieldFormatsStartCommon;
	shortDotsEnable?: boolean;
	metaFields?: string[];
}
interface AddDataTab {
	id: string;
	name: string;
	getComponent: () => JSX.Element;
}
interface AddToQueryLogDependencies {
	uiSettings: IUiSettingsClient;
	storage: IStorageWrapper;
}
interface AggConfigsOptions {
	typesRegistry: AggTypesRegistryStart;
	hierarchical?: boolean;
	aggExecutionContext?: AggTypesDependencies["aggExecutionContext"];
	partialRows?: boolean;
	probability?: number;
	samplerSeed?: number;
}
interface AggTypeConfig<TAggConfig extends AggConfig = AggConfig, TParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>> {
	name: string;
	title: string;
	createFilter?: (aggConfig: TAggConfig, key: any, params?: any) => any;
	type?: string;
	dslName?: string;
	expressionName: string;
	makeLabel?: ((aggConfig: TAggConfig) => string) | (() => string);
	ordered?: any;
	hasNoDsl?: boolean;
	hasNoDslParams?: boolean;
	params?: Array<Partial<TParam>>;
	getValueType?: (aggConfig: TAggConfig) => DatatableColumnType;
	getRequestAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
	getResponseAggs?: ((aggConfig: TAggConfig) => TAggConfig[]) | (() => TAggConfig[] | void);
	customLabels?: boolean;
	json?: boolean;
	decorateAggConfig?: () => any;
	postFlightRequest?: PostFlightRequestFn<TAggConfig>;
	hasPrecisionError?: (aggBucket: Record<string, unknown>) => boolean;
	getSerializedFormat?: (agg: TAggConfig) => SerializedFieldFormat;
	getValue?: (agg: TAggConfig, bucket: any) => any;
	getKey?: (bucket: any, key: any, agg: TAggConfig) => any;
	getValueBucketPath?: (agg: TAggConfig) => string;
	getResponseId?: (agg: TAggConfig) => string;
}
interface AggTypesDependencies {
	calculateBounds: CalculateBoundsFn;
	getConfig: <T = any>(key: string) => T;
	getFieldFormatsStart: () => Pick<FieldFormatsStartCommon, "deserialize" | "getDefaultInstance">;
	aggExecutionContext?: {
		shouldDetectTimeZone?: boolean;
	};
}
interface AggsCommonStart {
	calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
	createAggConfigs: (indexPattern: DataView$1, configStates?: CreateAggConfigParams[], options?: Partial<AggConfigsOptions>) => InstanceType<typeof AggConfigs>;
	types: ReturnType<AggTypesRegistry["start"]>;
}
interface AnonymousAccessServiceContract {
	/**
	 * This function returns the current state of anonymous access.
	 */
	getState: () => Promise<AnonymousAccessState>;
	/**
	 * This function returns the capabilities of the anonymous access user.
	 */
	getCapabilities: () => Promise<Capabilities>;
}
interface AnonymousAccessState {
	/**
	 * Whether anonymous access is enabled or not.
	 */
	isEnabled: boolean;
	/**
	 * If anonymous access is enabled, this reflects what URL parameters need to be added to a Kibana link to make it publicly accessible.
	 * Note that if anonymous access is the only authentication method, this will be null.
	 */
	accessURLParameters: Record<string, string> | null;
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
interface AppPluginSetupDependencies {
	data: DataPublicPluginStart;
	licensing: LicensingPluginStart;
}
interface AppSetupUIPluginDependencies {
	home?: HomePublicPluginSetup;
	devTools: DevToolsSetup;
	share: SharePublicSetup;
	usageCollection?: UsageCollectionSetup;
}
interface AppStartUIPluginDependencies {
	home?: HomePublicPluginStart;
	share: SharePublicStart;
	usageCollection?: UsageCollectionStart;
	data: DataPublicPluginStart;
	licensing: LicensingPluginStart;
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
interface BoolQuery {
	must: estypes.QueryDslQueryContainer[];
	must_not: estypes.QueryDslQueryContainer[];
	filter: estypes.QueryDslQueryContainer[];
	should: estypes.QueryDslQueryContainer[];
}
interface BrowserShortUrlClientDependencies {
	/**
	 * The locators service.
	 */
	locators: ILocatorClient;
	/**
	 * HTTP client.
	 */
	http: BrowserShortUrlClientHttp;
}
interface BrowserShortUrlClientHttp {
	basePath: {
		get: () => string;
	};
	fetch: <T>(url: string, params: BrowserShortUrlClientHttpFetchParams) => Promise<T>;
}
interface BrowserShortUrlClientHttpFetchParams {
	method: "GET" | "POST" | "DELETE";
	body?: string;
}
interface BucketAggParam<TBucketAggConfig extends IAggConfig> extends AggParamType<TBucketAggConfig> {
	scriptable?: boolean;
	filterFieldTypes?: FieldTypes;
	onlyAggregatable?: boolean;
	/**
	 * Filter available fields by passing filter fn on a {@link DataViewField}
	 * If used, takes precedence over filterFieldTypes and other filter params
	 */
	filterField?: FilterFieldFn;
}
interface BucketAggTypeConfig<TBucketAggConfig extends IAggConfig> extends AggTypeConfig<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
	getKey?: (bucket: any, key: any, agg: IAggConfig) => any;
	getShiftedKey?: (agg: TBucketAggConfig, key: string | number, timeShift: moment$1.Duration) => string | number;
	orderBuckets?(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number;
	splitForTimeShift?(agg: TBucketAggConfig, aggs: IAggConfigs): boolean;
	getTimeShiftInterval?(agg: TBucketAggConfig): undefined | moment$1.Duration;
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
interface CloudBasicUrls {
	/**
	 * This is the URL of the Cloud interface.
	 */
	baseUrl?: string;
	/**
	 * The full URL to the Kibana deployment.
	 */
	kibanaUrl?: string;
	/**
	 * This is the path to the Cloud deployments management page. The value is already prepended with `baseUrl`.
	 *
	 * @example `{baseUrl}/deployments`
	 */
	deploymentsUrl?: string;
	/**
	 * This is the path to the Cloud deployment management page for the deployment to which the Kibana instance belongs. The value is already prepended with `baseUrl`.
	 *
	 * @example `{baseUrl}/deployments/bfdad4ef99a24212a06d387593686d63`
	 */
	deploymentUrl?: string;
	/**
	 * The full URL to the user profile page on Elastic Cloud. Undefined if not running on Cloud.
	 */
	profileUrl?: string;
	/**
	 * The full URL to the organization management page on Elastic Cloud. Undefined if not running on Cloud.
	 */
	organizationUrl?: string;
	/**
	 * The full URL to the performance page on Elastic Cloud. Undefined if not running on Cloud.
	 */
	performanceUrl?: string;
	/**
	 * The full URL to the users and roles page on Elastic Cloud. Undefined if not running on Cloud.
	 */
	usersAndRolesUrl?: string;
	/**
	 * The full URL to the serverless projects page on Elastic Cloud. Undefined if not running in Serverless.
	 */
	projectsUrl?: string;
	/**
	 * This is the path to the Snapshots page for the deployment to which the Kibana instance belongs. The value is already prepended with `deploymentUrl`.
	 *
	 * @example `{deploymentUrl}/elasticsearch/snapshots`
	 */
	snapshotsUrl?: string;
}
interface CloudPrivilegedUrls {
	/**
	 * The full URL to the billing page on Elastic Cloud.
	 */
	billingUrl?: string;
}
interface CloudSetup extends CloudBasicUrls {
	/**
	 * Cloud ID. Undefined if not running on Cloud.
	 */
	cloudId?: string;
	/**
	 * The Elastic Cloud Organization that owns this deployment/project.
	 */
	organizationId?: string;
	/**
	 * The deployment's ID. Only available when running on Elastic Cloud.
	 */
	deploymentId?: string;
	/**
	 * This value is the same as `baseUrl` on ESS but can be customized on ECE.
	 *
	 * @example `cloud.elastic.co`
	 */
	cname?: string;
	/**
	 * The cloud service provider identifier.
	 *
	 * @note Expected to be one of `aws`, `gcp` or `azure`, but could be something different.
	 */
	csp?: string;
	/**
	 * Method to retrieve privileged URLs for the Cloud plugin.
	 */
	getPrivilegedUrls: () => Promise<CloudPrivilegedUrls>;
	/**
	 * Method to retrieve basic URLs for the Cloud plugin.
	 */
	getUrls: () => CloudUrls;
	/**
	 * Fetches the full URL to the elasticsearch cluster.
	 */
	fetchElasticsearchConfig: () => Promise<PublicElasticsearchConfigType>;
	/**
	 * {host} from the deployment url https://<deploymentId>.<application>.<host><?:port>
	 */
	cloudHost?: string;
	/**
	 * {port} from the deployment url https://<deploymentId>.<application>.<host><?:port>
	 */
	cloudDefaultPort?: string;
	/**
	 * `true` when Kibana is running on Elastic Cloud.
	 */
	isCloudEnabled: boolean;
	/**
	 * The end date for the Elastic Cloud trial. Only available on Elastic Cloud.
	 *
	 * @example `2020-10-14T10:40:22Z`
	 */
	trialEndDate?: Date;
	/**
	 * `true` if the Elastic Cloud organization that owns this deployment is owned by an Elastician. Only available when running on Elastic Cloud.
	 */
	isElasticStaffOwned?: boolean;
	/**
	 * Registers CloudServiceProviders so start's `CloudContextProvider` hooks them.
	 *
	 * @param contextProvider The React component from the Service Provider.
	 */
	registerCloudService: (contextProvider: React$1.FC) => void;
	/**
	 * Onboarding configuration
	 */
	onboarding: {
		/**
		 * The default solution selected during onboarding.
		 */
		defaultSolution?: SolutionId;
	};
	/**
	 * `true` when running on Serverless Elastic Cloud
	 * Note that `isCloudEnabled` will always be true when `isServerlessEnabled` is.
	 */
	isServerlessEnabled: boolean;
	/**
	 * Serverless configuration
	 */
	serverless: {
		/**
		 * The serverless projectId.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectId?: string;
		/**
		 * The serverless project name.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectName?: string;
		/**
		 * The serverless project type.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectType?: KibanaSolution;
		/**
		 * The serverless product tier.
		 * Only present if the current project type has product tiers defined.
		 * @remarks This field is only exposed for informational purposes. Use the `core.pricing` when checking if a feature if available for the current product tier.
		 * @internal
		 */
		productTier?: KibanaProductTier;
		/**
		 * The serverless orchestrator target. The potential values are `canary` or `non-canary`
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		orchestratorTarget?: string;
		/**
		 * Whether the serverless project belongs to an organization currently in trial.
		 */
		organizationInTrial?: boolean;
	};
	/**
	 * Method to retrieve if the organization is in trial.
	 */
	isInTrial: () => boolean;
}
interface CloudStart extends CloudBasicUrls {
	/**
	 * A React component that provides a pre-wired `React.Context` which connects components to Cloud services.
	 */
	CloudContextProvider: React$1.FC<React$1.PropsWithChildren<unknown>>;
	/**
	 * `true` when Kibana is running on Elastic Cloud.
	 */
	isCloudEnabled: boolean;
	/**
	 * Cloud ID.
	 */
	cloudId?: string;
	/**
	 * Fetches the full URL to the elasticsearch cluster.
	 */
	fetchElasticsearchConfig: () => Promise<PublicElasticsearchConfigType>;
	/**
	 * Method to retrieve privileged URLs for the Cloud plugin.
	 */
	getPrivilegedUrls: () => Promise<CloudPrivilegedUrls>;
	/**
	 * Method to retrieve basic URLs for the Cloud plugin.
	 */
	getUrls: () => CloudBasicUrls;
	/**
	 * Method to retrieve if the organization is in trial.
	 */
	isInTrial: () => boolean;
	/**
	 * `true` when running on Serverless Elastic Cloud
	 * Note that `isCloudEnabled` will always be true when `isServerlessEnabled` is.
	 */
	isServerlessEnabled: boolean;
	/**
	 * Serverless configuration
	 */
	serverless: {
		/**
		 * The serverless projectId.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectId?: string;
		/**
		 * The serverless project name.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectName?: string;
		/**
		 * The serverless project type.
		 * Will always be present if `isServerlessEnabled` is `true`
		 */
		projectType?: KibanaSolution;
		/**
		 * Whether the serverless project belongs to an organization currently in trial.
		 */
		organizationInTrial?: boolean;
	};
}
interface ConfigDeprecationDetails extends BaseDeprecationDetails {
	configPath: string;
	deprecationType: "config";
}
interface ConsolePluginSetup {
	/**
	 * Public locator for the console UI
	 */
	locator?: LocatorPublic<ConsoleUILocatorParams>;
}
interface ConsolePluginStart {
	/**
	 * isEmbeddedConsoleAvailable is available if the embedded console can be rendered. Returns true when
	 * called if the Embedded Console is currently rendered.
	 */
	isEmbeddedConsoleAvailable?: () => boolean;
	/**
	 * openEmbeddedConsole is available if the embedded console can be rendered. Calling
	 * this function will open the embedded console on the page if it is currently rendered.
	 */
	openEmbeddedConsole?: (content?: string) => void;
	/**
	 * openEmbeddedConsoleAlternateView is available if the embedded console can be rendered.
	 * Calling this function will open the embedded console to the alternative view. If there is no alternative view registered
	 * this will open the embedded console.
	 */
	openEmbeddedConsoleAlternateView?: () => void;
	/**
	 * EmbeddableConsole is a functional component used to render a portable version of the dev tools console on any page in Kibana
	 */
	EmbeddableConsole?: React$1.FC<{}>;
	/**
	 * Register an alternate view for the Embedded Console
	 *
	 * When registering an alternate view ensure that the content component you register is lazy loaded.
	 */
	registerEmbeddedConsoleAlternateView?: (view: EmbeddedConsoleView | null) => void;
}
interface ConsoleUILocatorParams extends SerializableRecord {
	loadFrom?: string;
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
interface CustomComponentProps {
	http: HomeKibanaServices["http"];
	basePath: string;
	isDarkTheme: boolean;
	kibanaVersion: string;
	variantId: string;
	isCloudEnabled: boolean;
}
interface DataPublicPluginStart {
	/**
	 * filter creation utilities
	 * {@link DataPublicPluginStartActions}
	 */
	actions: DataPublicPluginStartActions;
	/**
	 * data views service
	 * {@link DataViewsContract}
	 */
	dataViews: DataViewsContract$1;
	/**
	 * Datatable type utility functions.
	 */
	datatableUtilities: DatatableUtilitiesService;
	/**
	 * search service
	 * {@link ISearchStart}
	 */
	search: ISearchStart;
	/**
	 * @deprecated Use fieldFormats plugin instead
	 */
	fieldFormats: FieldFormatsStart;
	/**
	 * query service
	 * {@link QueryStart}
	 */
	query: QueryStart;
	nowProvider: NowProviderPublicContract;
}
interface DataPublicPluginStartActions {
	createFiltersFromValueClickAction: (context: ValueClickDataContext) => Promise<Filter[]>;
	createFiltersFromRangeSelectAction: (event: RangeSelectDataContext) => Promise<Filter[]>;
	createFiltersFromMultiValueClickAction: (context: MultiValueClickDataContext) => Promise<Filter[] | undefined>;
}
interface DataViewAttributes {
	/**
	 * Fields as a serialized array of field specs
	 */
	fields?: string;
	/**
	 * Data view title
	 */
	title: string;
	/**
	 * Data view type, default or rollup
	 */
	type?: string;
	/**
	 * Type metadata information, serialized. Only used by rollup data views.
	 */
	typeMeta?: string;
	/**
	 * Time field name
	 */
	timeFieldName?: string;
	/**
	 * Serialized array of filters. Used by discover to hide fields.
	 */
	sourceFilters?: string;
	/**
	 * Serialized map of field formats by field name
	 */
	fieldFormatMap?: string;
	/**
	 * Serialized map of field attributes, currently field count and name
	 */
	fieldAttrs?: string;
	/**
	 * Serialized map of runtime field definitions, by field name
	 */
	runtimeFieldMap?: string;
	/**
	 * Prevents errors when index pattern exists before indices
	 */
	allowNoIndex?: boolean;
	/**
	 * Name of the data view. Human readable name used to differentiate data view.
	 */
	name?: string;
	/**
	 * Allow hidden and system indices when loading field list
	 */
	allowHidden?: boolean;
}
interface DataViewBase extends DataViewBaseNoFields {
	fields: DataViewFieldBase[];
}
interface DataViewBaseNoFields {
	id?: string;
	title: string;
}
interface DataViewDeps {
	spec?: DataViewSpec;
	fieldFormats: FieldFormatsStartCommon;
	shortDotsEnable?: boolean;
	metaFields?: string[];
}
interface DataViewDeps$1 {
	spec?: DataViewSpec;
	fieldFormats: FieldFormatsStartCommon;
	shortDotsEnable?: boolean;
	metaFields?: string[];
	apiClient: IDataViewsApiClient;
	scriptedFieldsEnabled: boolean;
}
interface DataViewListItem {
	/**
	 * Saved object id (or generated id if in-memory only)
	 */
	id: string;
	/**
	 * Namespace ids
	 */
	namespaces?: string[];
	/**
	 * Data view title
	 */
	title: string;
	/**
	 * Data view type
	 */
	type?: string;
	/**
	 * Data view type meta
	 */
	typeMeta?: TypeMeta$1;
	/**
	 * Human-readable name
	 */
	name?: string;
	/**
	 * Time field name if applicable
	 */
	timeFieldName?: string;
	/**
	 * Whether the data view is managed by the application.
	 */
	managed?: boolean;
}
interface DataViewsServiceDeps {
	/**
	 * UiSettings service instance wrapped in a common interface
	 */
	uiSettings: UiSettingsCommon;
	/**
	 * Saved objects client interface wrapped in a common interface
	 */
	savedObjectsClient: PersistenceAPI;
	/**
	 * Wrapper around http call functionality so it can be used on client or server
	 */
	apiClient: IDataViewsApiClient;
	/**
	 * Field formats service
	 */
	fieldFormats: FieldFormatsStartCommon;
	/**
	 * Handler for service notifications
	 */
	onNotification: OnNotification;
	/**
	 * Handler for service errors
	 */
	onError: OnError;
	/**
	 * Redirects when there's no data view. only used on client
	 */
	onRedirectNoIndexPattern?: () => void;
	/**
	 * Determines whether the user can save data views
	 */
	getCanSave: () => Promise<boolean>;
	/**
	 * Determines whether the user can save advancedSettings (used for defaultIndex)
	 */
	getCanSaveAdvancedSettings: () => Promise<boolean>;
	scriptedFieldsEnabled: boolean;
}
interface DataViewsServicePublic extends DataViewsServicePublicMethods {
	getCanSaveSync: () => boolean;
	hasData: HasDataService;
	getIndices: (props: {
		pattern: string;
		showAllIndices?: boolean;
		isRollupIndex: (indexName: string) => boolean;
	}) => Promise<MatchedItem[]>;
	getRollupsEnabled: () => boolean;
	scriptedFieldsEnabled: boolean;
	/**
	 * Get existing index pattern list by providing string array index pattern list.
	 * @param indices - index pattern list
	 * @returns index pattern list of index patterns that match indices
	 */
	getExistingIndices: (indices: string[]) => Promise<string[]>;
}
interface DataViewsServicePublicMethods {
	/**
	 * Clear the cache of data view saved objects.
	 */
	clearCache: () => void;
	/**
	 * Clear the cache of data view instances.
	 */
	clearInstanceCache: (id?: string) => void;
	/**
	 * Clear the cache of lazy data view instances.
	 */
	clearDataViewLazyCache: (id: string) => void;
	/**
	 * Create data view based on the provided spec.
	 * @param spec - Data view spec.
	 * @param skipFetchFields - If true, do not fetch fields.
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	create: (spec: DataViewSpec, skipFetchFields?: boolean, displayErrors?: boolean) => Promise<DataView$1>;
	/**
	 * Create and save data view based on provided spec.
	 * @param spec - Data view spec.
	 * @param override - If true, save over existing data view
	 * @param skipFetchFields - If true, do not fetch fields.
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	createAndSave: (spec: DataViewSpec, override?: boolean, skipFetchFields?: boolean, displayErrors?: boolean) => Promise<DataView$1>;
	/**
	 * Save data view
	 * @param dataView - Data view  or data view lazy instance to save.
	 * @param override - If true, save over existing data view
	 */
	createSavedObject: (indexPattern: AbstractDataView, overwrite?: boolean) => Promise<void>;
	/**
	 * Delete data view
	 * @param indexPatternId - Id of the data view to delete.
	 */
	delete: (indexPatternId: string) => Promise<void>;
	/**
	 * Takes field array and field attributes and returns field map by name.
	 * @param fields - Array of fieldspecs
	 * @params fieldAttrs - Field attributes, map by name
	 * @returns Field map by name
	 */
	fieldArrayToMap: (fields: FieldSpec[], fieldAttrs?: FieldAttrsAsObject) => DataViewFieldMap;
	/**
	 * Search for data views based on title
	 * @param search - Search string
	 * @param size - Number of results to return
	 */
	find: (search: string, size?: number) => Promise<DataView$1[]>;
	/**
	 * Find and load lazy data views by title.
	 * @param search - Search string
	 * @param size - Number of results to return
	 */
	findLazy: (search: string, size?: number) => Promise<DataViewLazy[]>;
	/**
	 * Get data view by id.
	 * @param id - Id of the data view to get.
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	get: (id: string, displayErrors?: boolean, refreshFields?: boolean) => Promise<DataView$1>;
	/**
	 * Get populated data view saved object cache.
	 */
	getCache: () => Promise<Array<SavedObject<DataViewSavedObjectAttrs>> | null | undefined>;
	/**
	 * If user can save data view, return true.
	 */
	getCanSave: () => Promise<boolean>;
	/**
	 * Get default data view as data view instance.
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	getDefault: (displayErrors?: boolean) => Promise<DataView$1 | null>;
	/**
	 * Get default data view id.
	 */
	getDefaultId: () => Promise<string | null>;
	/**
	 * Get default data view, if it doesn't exist, choose and save new default data view and return it.
	 * @param {Object} options
	 * @param {boolean} options.refreshFields - If true, will refresh the fields of the default data view
	 * @param {boolean} [options.displayErrors=true] - If set false, API consumer is responsible for displaying and handling errors.
	 */
	getDefaultDataView: (options?: {
		refreshFields?: boolean;
		displayErrors?: boolean;
	}) => Promise<DataView$1 | null>;
	/**
	 * Get fields for data view
	 * @param dataView - Data view instance or spec
	 * @param options - Options for getting fields
	 * @returns FieldSpec array
	 */
	getFieldsForIndexPattern: (indexPattern: DataView$1 | DataViewSpec, options?: Omit<GetFieldsOptions, "allowNoIndex" | "pattern">) => Promise<FieldSpec[]>;
	/**
	 * Get fields for index pattern string
	 * @param options - options for getting fields
	 */
	getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldSpec[]>;
	/**
	 * Get list of data view ids.
	 * @param refresh - clear cache and fetch from server
	 */
	getIds: (refresh?: boolean) => Promise<string[]>;
	/**
	 * Get list of data view ids and title (and more) for each data view.
	 * @param refresh - clear cache and fetch from server
	 */
	getIdsWithTitle: (refresh?: boolean) => Promise<DataViewListItem[]>;
	/**
	 * Get list of data view ids and title (and more) for each data view.
	 * @param refresh - clear cache and fetch from server
	 */
	getTitles: (refresh?: boolean) => Promise<string[]>;
	/**
	 * Returns true if user has access to view a data view.
	 */
	hasUserDataView: () => Promise<boolean>;
	/**
	 * Refresh fields for data view instance
	 * @params dataView - Data view instance
	 */
	refreshFields: (indexPattern: DataView$1, displayErrors?: boolean, forceRefresh?: boolean) => Promise<void>;
	/**
	 * Converts data view saved object to spec
	 * @params savedObject - Data view saved object
	 */
	savedObjectToSpec: (savedObject: SavedObject<DataViewAttributes>) => DataViewSpec;
	/**
	 * Set default data view.
	 * @param id - Id of the data view to set as default.
	 * @param force - Overwrite if true
	 */
	setDefault: (id: string | null, force?: boolean) => Promise<void>;
	/**
	 * Save saved object
	 * @param indexPattern - data view instance
	 * @param saveAttempts - number of times to try saving
	 * @oaram ignoreErrors - if true, do not throw error on failure
	 * @param displayErrors - If set false, API consumer is responsible for displaying and handling errors.
	 */
	updateSavedObject: (indexPattern: AbstractDataView, saveAttempts?: number, ignoreErrors?: boolean, displayErrors?: boolean) => Promise<void>;
	/**
	 * Returns whether a default data view exists.
	 */
	defaultDataViewExists: () => Promise<boolean>;
	getMetaFields: () => Promise<string[] | undefined>;
	getShortDotsEnable: () => Promise<boolean | undefined>;
	toDataView: (toDataView: DataViewLazy) => Promise<DataView$1>;
	toDataViewLazy: (dataView: DataView$1) => Promise<DataViewLazy>;
	getAllDataViewLazy: () => Promise<DataViewLazy[]>;
	getDataViewLazy: (id: string) => Promise<DataViewLazy>;
	getDataViewLazyFromCache: (id: string) => Promise<DataViewLazy | undefined>;
	createDataViewLazy: (spec: DataViewSpec) => Promise<DataViewLazy>;
	createAndSaveDataViewLazy: (spec: DataViewSpec, override?: boolean) => Promise<DataViewLazy>;
	getDefaultDataViewLazy: () => Promise<DataViewLazy | null>;
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
interface DateHistogramMeta {
	interval?: string;
	timeZone?: string;
	timeRange?: TimeRange$1;
}
interface DeepPartialArray<T> extends Array<DeepPartial<T>> {
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
interface DevToolMountParams extends DevToolsStartServices {
	element: HTMLDivElement;
	history: RouteComponentProps["history"];
	location: RouteComponentProps["location"];
}
interface DevToolsSetup {
	/**
	 * Register a developer tool. It will be available
	 * in the dev tools app under a separate tab.
	 *
	 * Registering dev tools works almost similar to registering
	 * applications in the core application service,
	 * but they will be rendered with a frame containing tabs
	 * to switch between the tools.
	 * @param devTool The dev tools descriptor
	 */
	register: (devTool: CreateDevToolArgs) => DevToolApp;
}
interface DevToolsStartServices {
	analytics: Pick<AnalyticsServiceStart, "reportEvent">;
	i18n: I18nStart;
	theme: Pick<ThemeServiceStart, "theme$">;
	userProfile: UserProfileService;
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
interface DraftModeCalloutProps extends CommonProps {
	message?: string;
	saveButtonProps?: SaveButtonProps;
}
interface ESQLColumn {
	name: string;
	type: string;
	original_types?: string[];
}
interface ESQLSearchResponse {
	columns: ESQLColumn[];
	all_columns?: ESQLColumn[];
	values: ESQLRow[];
	took?: number;
	documents_found?: number;
	_clusters?: estypes.ClusterStatistics;
}
interface EmbeddedConsoleView {
	ActivationButton: React$1.ComponentType<EmbeddedConsoleViewButtonProps>;
	ViewContent: React$1.ComponentType<{}>;
}
interface EmbeddedConsoleViewButtonProps {
	activeView: boolean;
	onClick: React$1.MouseEventHandler<HTMLButtonElement>;
}
interface Environment {
	/**
	 * Flag whether the home app should advertise cloud features
	 */
	readonly cloud: boolean;
	/**
	 * Flag whether the home app should advertise apm features
	 */
	readonly apmUi: boolean;
	/**
	 * Flag whether the home app should advertise ml features
	 */
	readonly ml: boolean;
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
interface EsInterval {
	expression: string;
	unit: Unit;
	value: number;
}
interface EsQueryFiltersConfig {
	/**
	 * by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
	 */
	ignoreFilterIfFieldNotInIndex?: boolean;
	/**
	 * the nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
	 * The optional ignore_unmapped parameter defaults to false.
	 * This `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
	 */
	nestedIgnoreUnmapped?: boolean;
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
interface ExportGenerationOpts {
	optimizedForPrinting?: boolean;
	intl: InjectedIntl;
}
interface ExportShare extends ShareIntegration<{
	/**
	 * @deprecated only kept around for legacy reasons
	 */
	name?: string;
	icon?: EuiIconProps["type"];
	sortOrder?: number;
	/**
	 * @deprecated only kept around for legacy reasons
	 */
	toolTipContent?: string;
	label: string;
	exportType: string;
	/**
	 * allows disabling the export action, for instance the current app has no data to export
	 */
	disabled?: boolean;
	helpText?: React$1.ReactNode;
	generateExportButtonLabel?: React$1.ReactNode;
	generateAssetExport: (args: ExportGenerationOpts) => Promise<unknown>;
	renderCopyURIButton?: boolean;
	warnings?: Array<{
		title: string;
		message: string;
	}>;
	requiresSavedState?: boolean;
	supportedLayoutOptions?: Array<"print">;
	renderLayoutOptionSwitch?: boolean;
	renderTotalHitsSizeWarning?: (totalHits?: number) => React$1.ReactNode | undefined;
} & ({
	generateAssetComponent?: never;
	copyAssetURIConfig: {
		headingText: string;
		helpText?: string;
		contentType: EuiCodeProps["language"];
		generateAssetURIValue: (args: ExportGenerationOpts) => string | undefined;
	};
} | {
	generateAssetComponent: React$1.ReactNode;
	copyAssetURIConfig?: never;
} | {
	generateAssetComponent?: never;
	copyAssetURIConfig?: never;
})> {
	groupId: "export";
}
interface ExportShareDerivatives extends ShareIntegration<{
	label: React$1.FC<{
		openFlyout: () => void;
	}>;
	toolTipContent?: React$1.ReactNode;
	flyoutContent: React$1.FC<{
		closeFlyout: () => void;
		flyoutRef: React$1.RefObject<HTMLDivElement>;
	}>;
	flyoutSizing?: Pick<EuiFlyoutProps, "size" | "maxWidth">;
	shouldRender: ({ availableExportItems, }: {
		availableExportItems: ExportShareConfig[];
	}) => boolean;
}> {
	groupId: "exportDerivatives";
}
interface ExpressionAstOptions {
	/**
	 * When truthy, it will include either `esaggs` or `esdsl` function to the expression chain.
	 * In this case, the expression will perform a search and return the `datatable` structure.
	 * @default true
	 */
	asDatatable?: boolean;
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
interface FeatureCatalogueEntry {
	/** Unique string identifier for this feature. */
	readonly id: string;
	/** Title of feature displayed to the user. */
	readonly title: string;
	/** {@link FeatureCatalogueCategory} to display this feature in. */
	readonly category: FeatureCatalogueCategory;
	/** A tagline of feature displayed to the user. */
	readonly subtitle?: string;
	/** One-line description of feature displayed to the user. */
	readonly description: string;
	/** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
	readonly icon: IconType;
	/** URL path to link to this future. Should not include the basePath. */
	readonly path: string;
	/** Whether or not this link should be shown on the front page of Kibana. */
	readonly showOnHomePage: boolean;
	/** An ordinal used to sort features relative to one another for display on the home page */
	readonly order?: number;
	/** Optional function to control visibility of this feature. */
	readonly visible?: () => boolean;
	/** Unique string identifier of the solution this feature belongs to */
	readonly solutionId?: string;
}
interface FeatureCatalogueSolution {
	/** Unique string identifier for this solution. */
	readonly id: string;
	/** Title of solution displayed to the user. */
	readonly title: string;
	/** One-line description of the solution displayed to the user. */
	readonly description: string;
	/** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
	readonly icon: IconType;
	/** URL path to link to this future. Should not include the basePath. */
	readonly path: string;
	/** An ordinal used to sort solutions relative to one another for display on the home page */
	readonly order: number;
	/** Optional function to control visibility of this solution. */
	readonly isVisible?: (capabilities: Capabilities) => boolean;
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
interface FeatureUsageServiceStart {
	/**
	 * Notify of a registered feature usage at given time.
	 *
	 * @param featureId - the identifier of the feature to notify usage of
	 * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
	 */
	notifyUsage(featureId: string, usedAt?: Date | number): Promise<void>;
}
interface FetchHandlers {
	getConfig: GetConfigFn;
	/**
	 * Callback which can be used to hook into responses, modify them, or perform
	 * side effects like displaying UI errors on the client.
	 */
	onResponse: (request: SearchRequest, response: IKibanaSearchResponse, options: SearchSourceSearchOptions) => IKibanaSearchResponse;
}
interface FieldConfiguration {
	/**
	 * Field format in serialized form
	 */
	format?: SerializedFieldFormat | null;
	/**
	 * Custom label
	 */
	customLabel?: string;
	/**
	 * Custom description
	 */
	customDescription?: string;
	/**
	 * Popularity - used for discover
	 */
	popularity?: number;
}
interface FieldFormatConvert {
	text: TextContextTypeConvert;
	html: HtmlContextTypeConvert;
}
interface FieldFormatMetaParams {
	parsedUrl?: {
		origin: string;
		pathname?: string;
		basePath?: string;
	};
}
interface FieldsForWildcardResponse {
	fields: FieldsForWildcardSpec[];
	indices: string[];
	etag?: string;
}
interface FormatSearchParamsOptions {
	lzCompress?: boolean;
}
interface ForwardDefinition {
	legacyAppId: string;
	newAppId: string;
	rewritePath: (legacyPath: string) => string;
}
interface FoundPluginContractResolverResponseItem<ContractType = unknown> {
	found: true;
	contract: ContractType;
}
interface GetFieldsOptions {
	pattern: string;
	type?: string;
	metaFields?: string[];
	rollupIndex?: string;
	allowNoIndex?: boolean;
	indexFilter?: QueryDslQueryContainer;
	includeUnmapped?: boolean;
	fields?: string[];
	allowHidden?: boolean;
	forceRefresh?: boolean;
	fieldTypes?: string[];
	includeEmptyFields?: boolean;
	abortSignal?: AbortSignal;
	runtimeMappings?: estypes.MappingRuntimeFields;
}
interface GetFieldsParams {
	indexFilter?: QueryDslQueryContainer;
	unmapped?: boolean;
	fieldName: string[];
	mapped?: boolean;
	scripted?: boolean;
	runtime?: boolean;
	forceRefresh?: boolean;
	metaFields?: boolean;
	fieldTypes?: string[];
}
interface GetRedirectUrlOptions extends FormatSearchParamsOptions {
	/**
	 * Optional space ID to use when generating the URL.
	 * If not provided:
	 * - on the client the current space ID will be used.
	 * - on the server the URL will be generated without a space ID.
	 */
	spaceId?: string;
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
interface HasDataService {
	hasESData: () => Promise<boolean>;
	hasUserDataView: () => Promise<boolean>;
	hasDataView: () => Promise<boolean>;
}
interface HomeKibanaServices {
	dataViewsService: DataViewsContract$1;
	kibanaVersion: string;
	share: SharePublicSetup;
	shareStart: SharePublicStart;
	chrome: ChromeStart;
	application: ApplicationStart;
	uiSettings: IUiSettingsClient;
	urlForwarding: UrlForwardingStart;
	homeConfig: ConfigSchema;
	featureCatalogue: FeatureCatalogueRegistry;
	http: HttpStart;
	toastNotifications: NotificationsSetup["toasts"];
	banners: OverlayStart["banners"];
	trackUiMetric: (type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
	getBasePath: () => string;
	docLinks: DocLinksStart;
	addBasePath: (url: string) => string;
	environmentService: EnvironmentService;
	tutorialService: TutorialService;
	addDataService: AddDataService;
	welcomeService: WelcomeService;
	cloud: CloudSetup;
	cloudStart: CloudStart;
	overlays: OverlayStart;
	theme: ThemeServiceStart;
	i18nStart: I18nStart;
	history: AppMountParameters["history"];
}
interface HomePublicPluginSetup {
	tutorials: TutorialServiceSetup;
	addData: AddDataServiceSetup;
	featureCatalogue: FeatureCatalogueSetup;
	welcomeScreen: WelcomeServiceSetup;
	/**
	 * The environment service is only available for a transition period and will
	 * be replaced by display specific extension points.
	 * @deprecated
	 * @removeBy 8.8.0
	 */
	environment: EnvironmentSetup;
}
interface HomePublicPluginStart {
	featureCatalogue: FeatureCatalogueRegistry;
}
interface HtmlContextTypeOptions {
	field?: {
		name: string;
	};
	hit?: {
		highlight?: Record<string, string[]>;
	};
	skipFormattingInStringifiedJSON?: boolean;
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
interface IBucketAggConfig extends IAggConfig {
	type: InstanceType<typeof BucketAggType>;
}
interface IDataViewsApiClient {
	getFieldsForWildcard: (options: GetFieldsOptions) => Promise<FieldsForWildcardResponse>;
	hasUserDataView: () => Promise<boolean>;
}
interface IEsSearchRequest<T extends ISearchRequestParams = ISearchRequestParams> extends IKibanaSearchRequest<T> {
	indexType?: string;
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
interface IFieldSubTypeMulti {
	multi: {
		parent: string;
	};
}
interface IFieldSubTypeNested {
	nested: {
		path: string;
	};
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
interface IIndexPatternFieldList extends Array<DataViewField> {
	/**
	 * Creates a DataViewField instance. Does not add it to the data view.
	 * @param field field spec to create field instance
	 * @returns a new data view field instance
	 */
	create(field: FieldSpec): DataViewField;
	/**
	 * Add field to field list.
	 * @param field field spec to add field to list
	 * @returns data view field instance which was added to list
	 */
	add(field: FieldSpec): DataViewField;
	/**
	 * Returns fields as plain array of data view field instances.
	 */
	getAll(): DataViewField[];
	/**
	 * Get field by name. Optimized, uses map to find field.
	 * @param name name of field to find
	 * @returns data view field instance if found, undefined otherwise
	 */
	getByName(name: DataViewField["name"]): DataViewField | undefined;
	/**
	 * Get fields by field type. Optimized, uses map to find fields.
	 * @param type type of field to find
	 * @returns array of data view field instances if found, empty array otherwise
	 */
	getByType(type: DataViewField["type"]): DataViewField[];
	/**
	 * Remove field from field list
	 * @param field field for removal
	 */
	remove(field: DataViewField | FieldSpec): void;
	/**
	 * Remove all fields from field list.
	 */
	removeAll(): void;
	/**
	 * Replace all fields in field list with new fields.
	 * @param specs array of field specs to add to list
	 */
	replaceAll(specs: FieldSpec[]): void;
	/**
	 * Update a field in the list
	 * @param field field spec to update
	 */
	update(field: FieldSpec): void;
	/**
	 * Field list as field spec map by name
	 * @param options optionally provide a function to get field formatter for fields
	 * @return map of field specs by name
	 */
	toSpec(options?: ToSpecOptions): DataViewFieldMap;
}
interface IInspectorInfo {
	adapter?: RequestAdapter;
	title: string;
	id?: string;
	description?: string;
}
interface IKibanaSearchRequest<Params = any> {
	/**
	 * An id can be used to uniquely identify this request.
	 */
	id?: string;
	params?: Params;
}
interface IKibanaSearchResponse<RawResponse = any> {
	/**
	 * Some responses may contain a unique id to identify the request this response came from.
	 */
	id?: string;
	/**
	 * If relevant to the search strategy, return a total number
	 * that represents how progress is indicated.
	 */
	total?: number;
	/**
	 * If relevant to the search strategy, return a loaded number
	 * that represents how progress is indicated.
	 */
	loaded?: number;
	/**
	 * Indicates whether search is still in flight
	 */
	isRunning?: boolean;
	/**
	 * Indicates whether the results returned are complete or partial
	 */
	isPartial?: boolean;
	/**
	 * Indicates whether the results returned are from the async-search index
	 */
	isRestored?: boolean;
	/**
	 * Indicates whether the search has been saved to a search-session object and long keepAlive was set
	 */
	isStored?: boolean;
	/**
	 * Optional warnings returned from Elasticsearch (for example, deprecation warnings)
	 */
	warning?: string;
	/**
	 * The raw response returned by the internal search method (usually the raw ES response)
	 */
	rawResponse: RawResponse;
	/**
	 * HTTP request parameters from elasticsearch transport client t
	 */
	requestParams?: SanitizedConnectionRequestParams;
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
interface ILicense {
	/**
	 * UID for license.
	 */
	uid?: string;
	/**
	 * The validity status of the license.
	 */
	status?: LicenseStatus;
	/**
	 * Determine if the status of the license is active.
	 */
	isActive: boolean;
	/**
	 * Unix epoch of the expiration date of the license.
	 */
	expiryDateInMillis?: number;
	/**
	 * The license type, being usually one of basic, standard, gold, platinum, or trial.
	 */
	type?: LicenseType;
	/**
	 * The license type, being usually one of basic, standard, gold, platinum, or trial.
	 * @deprecated use 'type' instead.
	 * @removeBy 8.8.0
	 */
	mode?: LicenseType;
	/**
	 * Signature of the license content.
	 */
	signature: string;
	/**
	 * Determine if the license container has information.
	 */
	isAvailable: boolean;
	/**
	 * Returns
	 */
	toJSON: () => PublicLicenseJSON;
	/**
	 * A potential error denoting the failure of the license from being retrieved.
	 */
	error?: string;
	/**
	 * If the license is not available, provides a string or Error containing the reason.
	 */
	getUnavailableReason: () => string | undefined;
	/**
	 * Determine if license type >= minimal required license type.
	 * @param minimumLicenseRequired the minimum valid license required for the given feature
	 */
	hasAtLeast(minimumLicenseRequired: LicenseType): boolean;
	/**
	 * For a given plugin and license type, receive information about the status of the license.
	 * @param pluginName the name of the plugin
	 * @param minimumLicenseRequired the minimum valid license for operating the given plugin
	 */
	check(pluginName: string, minimumLicenseRequired: LicenseType): LicenseCheck;
	/**
	 * A specific API for interacting with the specific features of the license.
	 * @param name the name of the feature to interact with
	 */
	getFeature(name: string): LicenseFeature;
}
interface ILocatorClient extends PersistableStateService<LocatorData> {
	/**
	 * Create and register a new locator.
	 *
	 * @param locatorDefinition Definition of the new locator.
	 */
	create<P extends SerializableRecord>(locatorDefinition: LocatorDefinition<P>): LocatorPublic<P>;
	/**
	 * Retrieve a previously registered locator.
	 *
	 * @param id Unique ID of the locator.
	 */
	get<P extends SerializableRecord>(id: string): undefined | LocatorPublic<P>;
}
interface IMetricAggConfig extends AggConfig {
	type: InstanceType<typeof MetricAggType>;
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
interface ISearchOptions {
	/**
	 * An `AbortSignal` that allows the caller of `search` to abort a search request.
	 */
	abortSignal?: AbortSignal;
	/**
	 * Use this option to force using a specific server side search strategy. Leave empty to use the default strategy.
	 */
	strategy?: string;
	/**
	 * Request the legacy format for the total number of hits. If sending `rest_total_hits_as_int` to
	 * something other than `true`, this should be set to `false`.
	 */
	legacyHitsTotal?: boolean;
	/**
	 * A session ID, grouping multiple search requests into a single session.
	 */
	sessionId?: string;
	/**
	 * Whether the session is already saved (i.e. sent to background)
	 */
	isStored?: boolean;
	/**
	 * Whether the search was successfully polled after session was saved. Search was added to a session saved object and keepAlive extended.
	 */
	isSearchStored?: boolean;
	/**
	 * Whether the session is restored (i.e. search requests should re-use the stored search IDs,
	 * rather than starting from scratch)
	 */
	isRestore?: boolean;
	/**
	 * By default, when polling, we don't retrieve the results of the search request (until it is complete). (For async
	 * search, this is the difference between calling _async_search/{id} and _async_search/status/{id}.) setting this to
	 * `true` will request the search results, regardless of whether or not the search is complete.
	 */
	retrieveResults?: boolean;
	/**
	 * Represents a meta-information about a Kibana entity intitating a saerch request.
	 */
	executionContext?: KibanaExecutionContext;
	/**
	 * Index pattern reference is used for better error messages
	 */
	indexPattern?: AbstractDataView;
	/**
	 * TransportRequestOptions, other than `signal`, to pass through to the ES client.
	 * To pass an abort signal, use {@link ISearchOptions.abortSignal}
	 */
	transport?: Omit<TransportRequestOptions, "signal">;
	/**
	 * When set es results are streamed back to the caller without any parsing of the content.
	 */
	stream?: boolean;
	/**
	 * A hash of the request params. This is attached automatically by the search interceptor. It is used to link this request with a search session.
	 */
	requestHash?: string;
	/**
	 * Project routing configuration for cross-project search (CPS).
	 */
	projectRouting?: ProjectRouting;
}
interface ISearchStart {
	/**
	 * agg config sub service
	 * {@link AggsStart}
	 *
	 */
	aggs: AggsStart;
	/**
	 * low level search
	 * {@link ISearchGeneric}
	 */
	search: ISearchGeneric;
	/**
	 * Show toast for caught error
	 * @param e Error
	 */
	showError: (e: Error) => void;
	/**
	 * Show warnings, or customize how they're shown
	 * @param inspector IInspectorInfo - an inspector object with requests internally collected
	 * @param cb WarningHandlerCallback - optional callback to intercept warnings
	 */
	showWarnings: (adapter: RequestAdapter, cb?: WarningHandlerCallback) => void;
	/**
	 * Shows a flyout with a table to manage search sessions.
	 */
	showSearchSessionsFlyout: (attrs: {
		appId: string;
		trackingProps: {
			openedFrom: string;
		};
		onBackgroundSearchOpened?: BackgroundSearchOpenedHandler;
	}) => void;
	/**
	 * Feature flag value to make it easier to use in different plugins
	 */
	isBackgroundSearchEnabled: boolean;
	/**
	 * high level search
	 * {@link ISearchStartSearchSource}
	 */
	searchSource: ISearchStartSearchSource;
	/**
	 * Current session management
	 * {@link ISessionService}
	 */
	session: ISessionService;
	/**
	 * Search sessions SO CRUD
	 * {@link ISessionsClient}
	 */
	sessionsClient: ISessionsClient;
}
interface ISearchStartSearchSource extends PersistableStateService<SerializedSearchSourceFields> {
	/**
	 * creates {@link SearchSource} based on provided serialized {@link SearchSourceFields}
	 * @param fields
	 */
	create: (fields?: SerializedSearchSourceFields) => Promise<ISearchSource>;
	createLazy: (fields?: SerializedSearchSourceFields) => Promise<ISearchSource>;
	/**
	 * creates empty {@link SearchSource}
	 */
	createEmpty: () => ISearchSource;
}
interface IShortUrlClient {
	/**
	 * Create a new short URL.
	 *
	 * @param locator The locator for the URL.
	 * @param param The parameters for the URL.
	 * @returns The created short URL.
	 */
	create<P extends SerializableRecord>(params: ShortUrlCreateParams<P>): Promise<ShortUrl<P>>;
	/**
	 * Delete a short URL.
	 *
	 * @param slug The ID of the short URL.
	 */
	delete(id: string): Promise<void>;
	/**
	 * Fetch a short URL.
	 *
	 * @param id The ID of the short URL.
	 */
	get(id: string): Promise<ShortUrl>;
	/**
	 * Fetch a short URL by its slug.
	 *
	 * @param slug The slug of the short URL.
	 */
	resolve(slug: string): Promise<ShortUrl>;
}
interface IShortUrlClientFactory<D, Client extends IShortUrlClient = IShortUrlClient> {
	get(dependencies: D): Client;
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
interface IStorageWrapper<T = any, S = void> {
	get: (key: string) => T | null;
	set: (key: string, value: T) => S;
	remove: (key: string) => T | null;
	clear: () => void;
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
interface KibanaLocation<S = object> {
	/**
	 * Kibana application ID.
	 */
	app: string;
	/**
	 * A relative URL path within a Kibana application.
	 */
	path: string;
	/**
	 * A serializable location state object, which the app can use to determine
	 * what should be displayed on the screen.
	 */
	state: S;
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
interface KueryQueryOptions {
	filtersInMustClause?: boolean;
	dateFormatTZ?: string;
	/**
	 * the Nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
	 * The optional ignore_unmapped parameter defaults to false.
	 * The `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
	 */
	nestedIgnoreUnmapped?: boolean;
	/**
	 * Whether term-level queries should be treated as case-insensitive or not. For example, `agent.keyword: foobar` won't
	 * match a value of "FooBar" unless this parameter is `true`.
	 * (See https://www.elastic.co/guide/en/elasticsearch/reference/8.6/query-dsl-term-query.html#term-field-params)
	 */
	caseInsensitive?: boolean;
}
interface Labels {
	[key: string]: LabelValue;
}
interface LegacyShortUrlLocatorParams extends SerializableRecord {
	url: string;
}
interface LicenseCheck {
	/**
	 * The state of checking the results of a license type meeting the license minimum.
	 */
	state: LicenseCheckState;
	/**
	 * A message containing the reason for a license type not being valid.
	 */
	message?: string;
}
interface LicenseFeature {
	isAvailable: boolean;
	isEnabled: boolean;
}
interface LicensingPluginStart {
	/**
	 * Steam of licensing information {@link ILicense}.
	 */
	license$: Observable<ILicense>;
	/**
	 * Retrieves the {@link ILicense | licensing information}
	 */
	getLicense(): Promise<ILicense>;
	/**
	 * Triggers licensing information re-fetch.
	 */
	refresh(): Promise<ILicense>;
	/**
	 * APIs to manage licensed feature usage.
	 */
	featureUsage: FeatureUsageServiceStart;
}
interface LocatorData<LocatorParams extends SerializableRecord = SerializableRecord> extends VersionedState<LocatorParams>, SerializableRecord {
	/**
	 * Locator ID.
	 */
	id: string;
}
interface LocatorDefinition<P extends SerializableRecord> extends Partial<PersistableState<P>> {
	/**
	 * Unique ID of the locator. Should be constant and unique across Kibana.
	 */
	id: string;
	/**
	 * Returns a deep link, including location state, which can be used for
	 * navigation in Kibana.
	 *
	 * @param params Parameters from which to generate a Kibana location.
	 */
	getLocation(params: P): Promise<KibanaLocation>;
}
interface LocatorDependencies {
	/**
	 * Public URL of the Kibana server.
	 */
	baseUrl?: string;
	/**
	 * Current version of Kibana, e.g. `7.0.0`.
	 */
	version?: string;
	/**
	 * Navigate without reloading the page to a KibanaLocation.
	 */
	navigate: (location: KibanaLocation, params?: LocatorNavigationParams) => Promise<void>;
	/**
	 * Resolve a Kibana URL given KibanaLocation.
	 */
	getUrl: (location: KibanaLocation, getUrlParams: LocatorGetUrlParams) => Promise<string>;
}
interface LocatorGetUrlParams {
	/**
	 * Whether to return an absolute long URL or relative short URL.
	 */
	absolute?: boolean;
}
interface LocatorNavigationParams {
	/**
	 * Whether to replace a navigation entry in history queue or push a new entry.
	 */
	replace?: boolean;
}
interface LocatorPublic<P extends SerializableRecord> extends PersistableState<P> {
	readonly id: string;
	/**
	 * Returns a reference to a Kibana client-side location.
	 *
	 * @param params URL locator parameters.
	 */
	getLocation(params: P): Promise<KibanaLocation>;
	/**
	 * Returns a URL as a string.
	 *
	 * You may want to use `getRedirectUrl` instead. `getRedirectUrl` will
	 * preserve the location state, whereas the `getUrl` just returns the URL
	 * without the location state. Use this method if you know you don't need
	 * remember the location state and version of the URL locator.
	 *
	 * @param params URL locator parameters.
	 * @param getUrlParams URL construction parameters.
	 */
	getUrl(params: P, getUrlParams?: LocatorGetUrlParams): Promise<string>;
	/**
	 * Returns a URL to the redirect endpoint, which will redirect the user to
	 * the final destination.
	 *
	 * @param params URL locator parameters.
	 * @param options URL serialization options.
	 */
	getRedirectUrl(params: P, options?: GetRedirectUrlOptions): string;
	/**
	 * Navigate using the `core.application.navigateToApp()` method to a Kibana
	 * location generated by this locator. This method is available only on the
	 * browser.
	 *
	 * @param params URL locator parameters.
	 * @param navigationParams Navigation parameters.
	 */
	navigate(params: P, navigationParams?: LocatorNavigationParams): Promise<void>;
	/**
	 * Synchronous fire-and-forget navigation method. Use it when you want to
	 * navigate without waiting for the navigation to complete and you don't
	 * care to process any async promise errors.
	 *
	 * @param params URL locator parameters.
	 * @param navigationParams Navigation parameters.
	 */
	navigateSync(params: P, navigationParams?: LocatorNavigationParams): void;
	/**
	 * React hook which returns a URL string given locator parameters. Returns
	 * empty string if URL is being loaded or an error happened.
	 */
	useUrl: (params: P, getUrlParams?: LocatorGetUrlParams, deps?: React$1.DependencyList) => string;
}
interface LocatorsMigrationMap {
	[semver: string]: LocatorMigrationFunction;
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
interface MatchedItem {
	name: string;
	tags: Tag[];
	item: {
		name: string;
		backing_indices?: string[];
		timestamp_field?: string;
		indices?: string[];
		aliases?: string[];
		attributes?: ResolveIndexResponseItemIndexAttrs[];
		data_stream?: string;
		mode?: string;
	};
}
interface MetricAggParam<TMetricAggConfig extends AggConfig> extends AggParamType<TMetricAggConfig> {
	filterFieldTypes?: FieldTypes;
	onlyAggregatable?: boolean;
	scriptable?: boolean;
}
interface MetricAggTypeConfig<TMetricAggConfig extends AggConfig> extends AggTypeConfig<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
	isScalable?: () => boolean;
	subtype?: string;
	enableEmptyAsNull?: boolean;
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
interface MultiValueClickContext {
	embeddable?: unknown;
	data: {
		data: Array<{
			cells: Array<{
				column: number;
				row: number;
			}>;
			table: Pick<Datatable, "rows" | "columns" | "meta">;
			relation?: BooleanRelation;
		}>;
		timeFieldName?: string;
		negate?: boolean;
	};
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
interface ObjectTypeOptionsMeta {
	/**
	 * A string that uniquely identifies this schema. Used when generating OAS
	 * to create refs instead of inline schemas.
	 */
	id?: string;
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
interface PartitionedFilters {
	globalFilters: Filter[];
	appFilters: Filter[];
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
interface PersistenceAPI {
	/**
	 * Search for saved objects
	 * @param options - options for search
	 */
	find: (options: SavedObjectsClientCommonFindArgs) => Promise<Array<SavedObject<DataViewAttributes>>>;
	/**
	 * Get a single saved object by id
	 * @param type - type of saved object
	 * @param id - id of saved object
	 */
	get: (id: string) => Promise<SavedObject<DataViewAttributes>>;
	/**
	 * Update a saved object by id
	 * @param type - type of saved object
	 * @param id - id of saved object
	 * @param attributes - attributes to update
	 * @param options - client options
	 */
	update: (id: string, attributes: DataViewAttributes, options: {
		version?: string;
	}) => Promise<SavedObject>;
	/**
	 * Create a saved object
	 * @param attributes - attributes to set
	 * @param options - client options
	 */
	create: (attributes: DataViewAttributes, options: {
		id?: string;
		initialNamespaces?: string[];
		overwrite?: boolean;
		managed?: boolean;
	}) => Promise<SavedObject>;
	/**
	 * Delete a saved object by id
	 * @param type - type of saved object
	 * @param id - id of saved object
	 */
	delete: (id: string) => Promise<void>;
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
interface PublicElasticsearchConfigType {
	/**
	 * The URL to the Elasticsearch cluster, derived from elasticsearch.publicBaseUrl if populated
	 * Otherwise this is based on the cloudId
	 * If neither is populated, this will be undefined
	 */
	elasticsearchUrl?: string;
}
interface PublicLicense {
	/**
	 * UID for license.
	 */
	uid: string;
	/**
	 * The validity status of the license.
	 */
	status: LicenseStatus;
	/**
	 * Unix epoch of the expiration date of the license.
	 */
	expiryDateInMillis: number;
	/**
	 * The license type, being usually one of basic, standard, gold, platinum, or trial.
	 */
	type: LicenseType;
	/**
	 * The license type, being usually one of basic, standard, gold, platinum, or trial.
	 * @deprecated use 'type' instead
	 * @removeBy 8.8.0
	 */
	mode: LicenseType;
}
interface PublicLicenseJSON {
	license?: PublicLicense;
	features?: PublicFeatures;
	signature: string;
}
interface QueryStart extends PersistableStateService<QueryState> {
	filterManager: FilterManager;
	timefilter: TimefilterSetup;
	queryString: QueryStringContract;
	state$: QueryState$;
	getState(): QueryState;
	addToQueryLog: ReturnType<typeof createAddToQueryLog>;
	savedQueries: ReturnType<typeof createSavedQueryService>;
	getEsQuery(indexPattern: DataView$1, timeRange?: TimeRange): ReturnType<typeof buildEsQuery>;
}
interface QueryStateChange extends QueryStateChangePartial {
	appFilters?: boolean;
	globalFilters?: boolean;
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
interface RangeSelectDataContext {
	table: Datatable;
	column: number;
	range: number[];
	timeFieldName?: string;
	query?: AggregateQuery;
}
interface RecursiveReadonlyArray<T> extends ReadonlyArray<RecursiveReadonly<T>> {
}
interface RedirectOptions<P extends SerializableRecord = unknown & SerializableRecord> {
	/** Locator ID. */
	id: string;
	/** Kibana version when locator params were generated. */
	version: string;
	/** Locator params. */
	params: P;
}
interface RegisterShareIntegrationArgs<I extends ShareIntegration = ShareIntegration> extends Pick<I, "id" | "groupId" | "prerequisiteCheck"> {
	getShareIntegrationConfig: I["config"];
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
interface RuntimeField extends RuntimeFieldBase, FieldConfiguration {
	/**
	 * Subfields of composite field
	 */
	fields?: RuntimeFieldSubFields;
}
interface RuntimeFieldSubField extends FieldConfiguration {
	type: RuntimePrimitiveTypes;
}
interface SaveButtonProps extends CommonProps {
	onSave: () => Promise<void>;
	label?: string;
	isSaving?: boolean;
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
interface SavedObjectBody {
	fieldAttrs?: string;
	title?: string;
	timeFieldName?: string;
	fields?: string;
	sourceFilters?: string;
	fieldFormatMap?: string;
	typeMeta?: string;
	type?: string;
}
interface SavedObjectError {
	error: string;
	message: string;
	statusCode: number;
	metadata?: Record<string, unknown>;
}
interface SavedObjectReference {
	name: string;
	type: string;
	id: string;
}
interface SavedObjectsClientCommonFindArgs {
	/**
	 * Saved object fields
	 */
	fields?: string[];
	/**
	 * Results per page
	 */
	perPage?: number;
	/**
	 * Query string
	 */
	search?: string;
	/**
	 * Fields to search
	 */
	searchFields?: string[];
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
interface SavedObjectsMigrationVersion {
	/** The plugin name and version string */
	[pluginName: string]: string;
}
interface SavedObjectsPitParams {
	/** The ID of point-in-time */
	id: string;
	/** Optionally specify how long ES should keep the PIT alive until the next request. Defaults to `5m`. */
	keepAlive?: string;
}
interface SavedObjectsUpdateResponse<T = unknown> extends Omit<SavedObject<T>, "attributes" | "references"> {
	/** partial attributes of the saved object */
	attributes: Partial<T>;
	/** optionally included references to other saved objects */
	references: SavedObjectReference[] | undefined;
}
interface SavedQuery {
	id: string;
	attributes: SavedQueryAttributes;
	namespaces: string[];
}
interface SavedQueryAttributes {
	title: string;
	description: string;
	query: Query;
	filters?: Filter[];
	timefilter?: SavedQueryTimeFilter;
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
interface SearchResponseIncompleteWarning {
	/**
	 * type: for sorting out incomplete warnings
	 */
	type: "incomplete";
	/**
	 * requestName: human-friendly request name
	 */
	requestName: string;
	/**
	 * clusters: cluster details.
	 */
	clusters: Record<string, estypes.ClusterDetails>;
	/**
	 * openInInspector: callback to open warning in inspector
	 */
	openInInspector: () => void;
}
interface SearchSessionIndicatorUiConfig {
	/**
	 * App controls if "Search session indicator" UI should be disabled.
	 * reasonText will appear in a tooltip.
	 *
	 * Could be used, for example, to disable "Search session indicator" UI
	 * in case user doesn't have permissions to store a search session
	 */
	isDisabled: () => {
		disabled: true;
		reasonText: string;
	} | {
		disabled: false;
	};
}
interface SearchSessionInfoProvider<P extends SerializableRecord = SerializableRecord> {
	/**
	 * User-facing name of the session.
	 * e.g. will be displayed in saved Search Sessions management list
	 */
	getName: () => Promise<string>;
	/**
	 * Append session start time to a session name,
	 * `true` by default
	 */
	appendSessionStartTimeToName?: boolean;
	getLocatorData: () => Promise<{
		id: string;
		initialState: P;
		restoreState: P;
	}>;
}
interface SearchSessionRequestInfo {
	/**
	 * ID of the async search request
	 */
	id: string;
	/**
	 * Search strategy used to submit the search request
	 */
	strategy: string;
}
interface SearchSessionSavedObjectAttributes {
	sessionId: string;
	/**
	 * User-facing session name to be displayed in session management
	 */
	name?: string;
	/**
	 * App that created the session. e.g 'discover'
	 */
	appId?: string;
	/**
	 * Creation time of the session
	 */
	created: string;
	/**
	 * Expiration time of the session. Expiration itself is managed by Elasticsearch.
	 */
	expires: string;
	/**
	 * locatorId (see share.url.locators service)
	 */
	locatorId?: string;
	/**
	 * The application state that was used to create the session.
	 * Should be used, for example, to re-load an expired search session.
	 */
	initialState?: SerializableRecord;
	/**
	 * Application state that should be used to restore the session.
	 * For example, relative dates are conveted to absolute ones.
	 */
	restoreState?: SerializableRecord;
	/**
	 * Mapping of search request hashes to their corresponsing info (async search id, etc.)
	 */
	idMapping: Record<string, SearchSessionRequestInfo>;
	/**
	 * The realm type/name & username uniquely identifies the user who created this search session
	 */
	realmType?: string;
	realmName?: string;
	username?: string;
	/**
	 * Version information to display warnings when trying to restore a session from a different version
	 */
	version: string;
	/**
	 * `true` if session was cancelled
	 */
	isCanceled?: boolean;
}
interface SearchSessionStatusResponse {
	status: SearchSessionStatus;
	errors?: string[];
}
interface SearchSessionsFindResponse extends SavedObjectsFindResponse<SearchSessionSavedObjectAttributes> {
	/**
	 * Map containing calculated statuses of search sessions from the find response
	 */
	statuses: Record<string, SearchSessionStatusResponse>;
}
interface SearchSourceDependencies extends FetchHandlers {
	aggs: AggsStart;
	search: ISearchGeneric;
	dataViews: DataViewsContract;
	scriptedFieldsEnabled: boolean;
}
interface SearchSourceFields {
	type?: string;
	/**
	 * {@link Query}
	 */
	query?: Query | AggregateQuery;
	/**
	 * {@link Filter}
	 */
	filter?: Filter[] | Filter | (() => Filter[] | Filter | undefined);
	/**
	 * Filters that should not trigger highlighting.
	 * These filters will be included in the search query for document retrieval,
	 * but excluded from the highlight_query parameter in Elasticsearch.
	 * {@link Filter}
	 */
	nonHighlightingFilters?: Filter[];
	/**
	 * {@link EsQuerySortValue}
	 */
	sort?: EsQuerySortValue | EsQuerySortValue[];
	highlight?: any;
	highlightAll?: boolean;
	trackTotalHits?: boolean | number;
	/**
	 * {@link AggConfigs}
	 */
	aggs?: object | IAggConfigs | (() => object);
	from?: number;
	size?: number;
	source?: boolean | estypes.Fields;
	version?: boolean;
	/**
	 * Retrieve fields via the search Fields API
	 */
	fields?: SearchFieldValue[];
	/**
	 * Retreive fields directly from _source (legacy behavior)
	 *
	 * @deprecated It is recommended to use `fields` wherever possible.
	 */
	fieldsFromSource?: estypes.Fields;
	/**
	 * {@link IndexPatternService}
	 */
	index?: DataView$1;
	timeout?: string;
	terminate_after?: number;
	searchAfter?: estypes.SortResults;
	/**
	 * Allow querying to use a point-in-time ID for paging results
	 */
	pit?: estypes.SearchPointInTimeReference;
	/**
	 * {@link ProjectRouting}
	 */
	projectRouting?: ProjectRouting;
	parent?: SearchSourceFields;
}
interface SearchSourceOptions {
	callParentStartHandlers?: boolean;
}
interface SearchSourceSearchOptions extends ISearchOptions {
	/**
	 * Inspector integration options
	 */
	inspector?: IInspectorInfo;
	/**
	 * Set to true to disable warning toasts and customize warning display
	 */
	disableWarningToasts?: boolean;
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
interface SessionMeta {
	state: SearchSessionState;
	name?: string;
	startTime?: Date;
	canceledTime?: Date;
	completedTime?: Date;
	/**
	 * @deprecated - see remarks in {@link SessionStateInternal}
	 */
	isContinued: boolean;
}
interface SessionPureSelectors<SearchDescriptor = unknown, SearchMeta extends {} = {}, S = SessionStateInternal<SearchDescriptor, SearchMeta>> {
	getState: (state: S) => () => SearchSessionState;
	getMeta: (state: S) => () => SessionMeta;
	getSearch: (state: S) => (search: SearchDescriptor) => TrackedSearch<SearchDescriptor, SearchMeta> | null;
}
interface SessionPureTransitions<SearchDescriptor = unknown, SearchMeta extends {} = {}, S = SessionStateInternal<SearchDescriptor, SearchMeta>> {
	start: (state: S) => ({ appName }: {
		appName: string;
	}) => S;
	restore: (state: S) => (sessionId: string) => S;
	clear: (state: S) => () => S;
	save: (state: S) => () => S;
	store: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
	trackSearch: (state: S) => (search: SearchDescriptor, meta?: SearchMeta) => S;
	removeSearch: (state: S) => (search: SearchDescriptor) => S;
	completeSearch: (state: S) => (search: SearchDescriptor) => S;
	errorSearch: (state: S) => (search: SearchDescriptor) => S;
	updateSearchMeta: (state: S) => (search: SearchDescriptor, meta: Partial<SearchMeta>) => S;
	cancel: (state: S) => () => S;
	setSearchSessionSavedObject: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
}
interface SessionStateInternal<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
	/**
	 * Current session Id
	 * Empty means there is no current active session.
	 */
	sessionId?: string;
	/**
	 * App that created this session
	 */
	appName?: string;
	/**
	 * Is the session in the process of being saved?
	 */
	isSaving: boolean;
	/**
	 * Has the session already been stored (i.e. "sent to background")?
	 */
	isStored: boolean;
	/**
	 * Saved object of a current search session
	 */
	searchSessionSavedObject?: SearchSessionSavedObject;
	/**
	 * Is this session a restored session (have these requests already been made, and we're just
	 * looking to re-use the previous search IDs)?
	 */
	isRestore: boolean;
	/**
	 * Set of all searches within a session and any info associated with them
	 */
	trackedSearches: Array<TrackedSearch<SearchDescriptor, SearchMeta>>;
	/**
	 * There was at least a single search in this session
	 */
	isStarted: boolean;
	/**
	 * If user has explicitly canceled search requests
	 */
	isCanceled: boolean;
	/**
	 * If session was continued from a different app,
	 * If session continued from a different app, then it is very likely that `trackedSearches`
	 * doesn't have all the search that were included into the session.
	 * Session that was continued can't be saved because we can't guarantee all the searches saved.
	 * This limitation should be fixed in https://github.com/elastic/kibana/issues/121543
	 *
	 * @deprecated - https://github.com/elastic/kibana/issues/121543
	 */
	isContinued: boolean;
	/**
	 * Start time of the current session (from browser perspective)
	 */
	startTime?: Date;
	/**
	 * Time when all the searches from the current session are completed (from browser perspective)
	 */
	completedTime?: Date;
	/**
	 * Time when the session was canceled by user, by hitting "stop"
	 */
	canceledTime?: Date;
}
interface SessionsClientDeps {
	http: HttpSetup;
}
interface SettingsStart {
	client: IUiSettingsClient;
	globalClient: IUiSettingsClient;
}
interface ShareContext {
	/**
	 * The type of the object to share. for example lens, dashboard, etc.
	 */
	objectType: string;
	/**
	 * An alias of type of the object to share, that's more human friendly.
	 */
	objectTypeAlias?: string;
	/**
	 * Allows for passing contextual information that each consumer can provide to customize the share menu
	 */
	objectTypeMeta: {
		title: string;
		config: Partial<{
			[T in Exclude<ShareTypes, "legacy">]: ShareUIConfig[T];
		}>;
	};
	/**
	 * Id of the object that's been attempted to be shared
	 */
	objectId?: string;
	/**
	 * Current url for sharing. This can be set in cases where `window.location.href`
	 * does not contain a shareable URL (e.g. if using session storage to store the current
	 * app state is enabled). In these cases the property should contain the URL in a
	 * format which makes it possible to use it without having access to any other state
	 * like the current session.
	 *
	 * If not set it will default to `window.location.href`
	 */
	shareableUrl?: string;
	/**
	 * @deprecated prefer {@link delegatedShareUrlHandler}
	 */
	shareableUrlForSavedObject?: string;
	shareableUrlLocatorParams?: {
		locator: LocatorPublic<any>;
		params: ShareableUrlLocatorParams;
	};
	sharingData: {
		[key: string]: unknown;
	};
	isDirty: boolean;
	onClose: () => void;
}
interface ShareContextMenuPanelItem extends Omit<EuiContextMenuPanelItemDescriptorEntry, "name"> {
	name: string;
	sortOrder?: number;
}
interface ShareLegacy {
	shareType: "legacy";
	id: ShareMenuProviderLegacy["id"];
	config: ShareMenuProviderLegacy["getShareMenuItemsLegacy"];
}
interface ShareMenuItemBase {
	shareMenuItem?: ShareContextMenuPanelItem;
}
interface ShareMenuItemLegacy extends ShareMenuItemBase {
	panel?: EuiContextMenuPanelDescriptor;
}
interface ShareMenuManagerStartDeps {
	core: CoreStart;
	isServerless: boolean;
	resolveShareItemsForShareContext: ShareRegistry["resolveShareItemsForShareContext"];
}
interface ShareMenuProviderLegacy {
	readonly id: string;
	getShareMenuItemsLegacy: (context: ShareContext) => ShareMenuItemLegacy[];
}
interface SharePublicSetup extends ShareMenuRegistrySetup {
	/**
	 * Utilities to work with URL locators and short URLs.
	 */
	url: BrowserUrlService;
	/**
	 * Accepts serialized values for extracting a locator, migrating state from a provided version against
	 * the locator, then using the locator to navigate.
	 */
	navigate(options: RedirectOptions): void;
	/**
	 * Sets the provider for the anonymous access service; this is consumed by the Security plugin to avoid a circular dependency.
	 */
	setAnonymousAccessServiceProvider: (provider: () => AnonymousAccessServiceContract) => void;
}
interface ShareRegistryApiStart {
	capabilities: Capabilities;
	urlService: BrowserUrlService;
	anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
	getLicense: () => ILicense | undefined;
}
interface ShareRegistryInternalApi {
	registerShareIntegration<I extends ShareIntegration>(shareObject: string, arg: RegisterShareIntegrationArgs<I>): void;
	registerShareIntegration<I extends ShareIntegration>(arg: RegisterShareIntegrationArgs<I>): void;
	resolveShareItemsForShareContext(args: ShareContext): Promise<ShareConfigs[]>;
}
interface ShareUIConfig {
	link: LinkShareUIConfig;
	embed: EmbedShareUIConfig;
	integration: {
		[key: string]: ShareActionUserInputBase;
		export: ExportShareUIConfig;
	};
}
interface ShortUrl<LocatorParams extends SerializableRecord = SerializableRecord> {
	/**
	 * Serializable state of the short URL, which is stored in Kibana.
	 */
	readonly data: ShortUrlData<LocatorParams>;
}
interface ShortUrlCreateFromLongUrlResponse extends ShortUrlCreateResponse<LegacyShortUrlLocatorParams> {
	url: string;
}
interface ShortUrlCreateParams<P extends SerializableRecord> {
	/**
	 * Locator which will be used to resolve the short URL.
	 */
	locator: LocatorPublic<P>;
	/**
	 * Locator parameters which will be used to resolve the short URL.
	 */
	params: P;
	/**
	 * Optional, short URL slug - the part that will be used to resolve the short
	 * URL. This part will be visible to the user, it can have user-friendly text.
	 */
	slug?: string;
}
interface ShortUrlCreateResponse<LocatorParams extends SerializableRecord = SerializableRecord> extends ShortUrl<LocatorParams> {
	locator: LocatorPublic<ShortUrlRedirectLocatorParams>;
	params: ShortUrlRedirectLocatorParams;
}
interface ShortUrlData<LocatorParams extends SerializableRecord = SerializableRecord> {
	/**
	 * Unique ID of the short URL.
	 */
	readonly id: string;
	/**
	 * The slug of the short URL, the part after the `/` in the URL.
	 */
	readonly slug: string;
	/**
	 * Number of times the short URL has been resolved.
	 */
	readonly accessCount: number;
	/**
	 * The timestamp of the last time the short URL was resolved.
	 */
	readonly accessDate: number;
	/**
	 * The timestamp when the short URL was created.
	 */
	readonly createDate: number;
	/**
	 * The timestamp when the short URL was last modified.
	 */
	readonly locator: LocatorData<LocatorParams>;
}
interface ShortUrlRedirectLocatorParams extends SerializableRecord {
	slug: string;
}
interface ShowShareMenuOptions extends Omit<ShareContext, "onClose"> {
	asExport?: boolean;
	anchorElement?: HTMLElement;
	allowShortUrl: boolean;
	onClose?: () => void;
	publicAPIEnabled?: boolean;
	onSave?: () => Promise<void>;
}
interface StateContainer<State extends BaseState, PureTransitions extends object = object, PureSelectors extends object = {}> extends BaseStateContainer<State> {
	transitions: Readonly<PureTransitionsToTransitions<PureTransitions>>;
	selectors: Readonly<PureSelectorsToSelectors<PureSelectors>>;
}
interface Tag {
	name: string;
	key: string;
	color: string;
}
interface TextContextTypeOptions {
	skipFormattingInStringifiedJSON?: boolean;
	timezone?: string;
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
interface TimeBasedDataView extends DataView$1 {
	/**
	 * The timestamp field name.
	 */
	timeFieldName: NonNullable<DataView$1["timeFieldName"]>;
	/**
	 * The timestamp field.
	 */
	getTimeField: () => DataViewField;
}
interface TimeBucketsInterval extends moment$1.Duration {
	description: string;
	esValue: EsInterval["value"];
	esUnit: EsInterval["unit"];
	expression: EsInterval["expression"];
	preScaled?: TimeBucketsInterval;
	scale?: number;
	scaled?: boolean;
}
interface TimeRangeBounds {
	min: moment$1.Moment | undefined;
	max: moment$1.Moment | undefined;
}
interface TimeState {
	timeRange: TimeRange;
	asAbsoluteTimeRange: AbsoluteTimeRange;
	start: number;
	end: number;
}
interface TimeStateUpdate {
	timeState: TimeState;
	kind: TimeStateChange;
}
interface TimefilterConfig {
	timeDefaults: TimeRange;
	refreshIntervalDefaults: RefreshInterval;
	minRefreshIntervalDefault: number;
}
interface TimefilterHook {
	timeState: TimeState;
	refresh: () => void;
	timeState$: Observable<TimeStateUpdate>;
}
interface TimefilterSetup {
	timefilter: TimefilterContract;
	history: TimeHistoryContract;
}
interface ToSpecConfig {
	/**
	 * Field format getter
	 */
	getFormatterForField?: DataView$1["getFormatterForField"];
}
interface ToSpecOptions {
	getFormatterForField?: DataView$1["getFormatterForField"];
}
interface ToastOptions {
	/**
	 * How long should the toast remain on screen.
	 */
	toastLifeTimeMs?: number;
}
interface TrackSearchDescriptor {
	/**
	 * Cancel the search
	 */
	abort: (reason: AbortReason) => void;
	/**
	 * Used for polling after running in background (to ensure the search makes it into the background search saved
	 * object) and also to keep the search alive while other search requests in the session are still in progress
	 * @param abortSignal - signal that can be used to cancel the polling - otherwise the `searchAbortController.getSignal()` is used
	 */
	poll: (abortSignal?: AbortSignal) => Promise<void>;
	/**
	 * Notify search that session is being saved, could be used to restart the search with different params
	 * @deprecated - this is used as an escape hatch for TSVB/Timelion to restart a search with different params
	 */
	onSavingSession?: (options: Required<Pick<ISearchOptions, "sessionId" | "isRestore" | "isStored">>) => Promise<void>;
}
interface TrackSearchHandler {
	/**
	 * Transition search into "complete" status
	 */
	complete(response?: IKibanaSearchResponse): void;
	/**
	 * Transition search into "error" status
	 */
	error(error?: Error): void;
	/**
	 * Call to notify when search is about to be polled to get current search state to build `searchOptions` from (mainly isSearchStored),
	 * When poll completes or errors, call `afterPoll` callback and confirm is search was successfully stored
	 */
	beforePoll(): [
		currentSearchState: {
			isSearchStored: boolean;
		},
		afterPoll: (newSearchState: {
			isSearchStored: boolean;
		}) => void
	];
}
interface TrackSearchMeta {
	/**
	 * Time that indicates when last time this search was polled
	 */
	lastPollingTime: Date;
	/**
	 * If the keep_alive of this search was extended up to saved session keep_alive
	 */
	isStored: boolean;
}
interface TrackedSearch<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
	state: TrackedSearchState;
	searchDescriptor: SearchDescriptor;
	searchMeta: SearchMeta;
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
interface UISession {
	id: string;
	name: string;
	appId: string;
	created: string;
	expires: string | null;
	status: UISearchSessionState;
	idMapping: SearchSessionSavedObjectAttributes["idMapping"];
	numSearches: number;
	actions?: ACTION[];
	reloadUrl: string;
	restoreUrl: string;
	initialState: Record<string, unknown>;
	restoreState: Record<string, unknown>;
	version: string;
	errors?: string[];
}
interface UiSettingsCommon {
	/**
	 * Get a setting value
	 * @param key name of value
	 */
	get: <T = unknown>(key: string) => Promise<T | undefined>;
	/**
	 * Get all settings values
	 */
	getAll: () => Promise<Record<string, unknown>>;
	/**
	 * Set a setting value
	 * @param key name of value
	 * @param value value to set
	 */
	set: <T = unknown>(key: string, value: T) => Promise<void>;
	/**
	 * Remove a setting value
	 * @param key name of value
	 */
	remove: (key: string) => Promise<void>;
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
interface UnknownOptions {
	unknowns?: OptionsForUnknowns;
}
interface UrlParamExtension {
	paramName: string;
	component: React$1.ComponentType<UrlParamExtensionProps>;
}
interface UrlParamExtensionProps {
	setParamValue: (values: {}) => void;
}
interface UrlServiceDependencies<D = unknown, ShortUrlClient extends IShortUrlClient = IShortUrlClient> extends LocatorClientDependencies {
	shortUrls: IShortUrlClientFactoryProvider<D, ShortUrlClient>;
}
interface UsageCollectionSetup {
	/** Component helpers to track usage collection in the UI **/
	components: {
		/**
		 * The context provider to wrap the application if planning to use
		 * {@link TrackApplicationView} somewhere inside the app.
		 *
		 * @example
		 * ```typescript jsx
		 * class MyPlugin implements Plugin {
		 *   ...
		 *   public setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
		 *     const ApplicationUsageTrackingProvider = plugins.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;
		 *
		 *     core.application.register({
		 *       id,
		 *       title,
		 *       ...,
		 *       mount: async (params: AppMountParameters) => {
		 *         ReactDOM.render(
		 *           <ApplicationUsageTrackingProvider> // Set the tracking context provider at the App level
		 *             <I18nProvider>
		 *               <App />
		 *             </I18nProvider>
		 *           </ApplicationUsageTrackingProvider>,
		 *           element
		 *         );
		 *         return () => ReactDOM.unmountComponentAtNode(element);
		 *       },
		 *     });
		 *   }
		 *   ...
		 * }
		 * ```
		 */
		ApplicationUsageTrackingProvider: React$1.FC<React$1.PropsWithChildren<unknown>>;
	};
	/** Report whenever a UI event occurs for UI counters to report it **/
	reportUiCounter: (appName: string, type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
}
interface UsageCollectionStart {
	/** Report whenever a UI event occurs for UI counters to report it **/
	reportUiCounter: (appName: string, type: UiCounterMetricType, eventNames: string | string[], count?: number) => void;
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
interface ValueClickDataContext {
	data: Array<{
		table: Pick<Datatable, "rows" | "columns" | "meta">;
		column: number;
		row: number;
		value: any;
	}>;
	timeFieldName?: string;
	negate?: boolean;
	query?: AggregateQuery;
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
interface WelcomeServiceSetup {
	/**
	 * Register listeners to be called when the Welcome component is mounted.
	 * It can be called multiple times to register multiple listeners.
	 */
	registerOnRendered: (onRendered: () => void) => void;
	/**
	 * Register a renderer of the telemetry notice to be shown below the Welcome page.
	 */
	registerTelemetryNoticeRenderer: (renderTelemetryNotice: WelcomeRenderTelemetryNotice) => void;
}
type AddDataServiceSetup = ReturnType<AddDataService["setup"]>;
type AgentBuilderApp = typeof AGENT_BUILDER_APP_ID;
type AgentBuilderLinkId = "conversations" | "tools" | "agents" | "agents_create";
type AggConfigOptions = Assign<AggConfigSerialized, {
	type: IAggType;
}>;
type AggConfigSerialized = Ensure<{
	type: string;
	enabled?: boolean;
	id?: string;
	params?: {} | SerializableRecord;
	schema?: string;
}, SerializableRecord>;
type AggTypesRegistryStart = ReturnType<AggTypesRegistry["start"]>;
type AggregateQuery = {
	esql: string;
};
type AggregationRestrictions = Record<string, {
	agg?: string;
	interval?: number;
	fixed_interval?: string;
	calendar_interval?: string;
	delay?: string;
	time_zone?: string;
}>;
type AggsStart = Assign<AggsCommonStart, {
	types: AggTypesRegistryStart;
}>;
type AiAssistantApp = typeof AI_ASSISTANT_APP_ID;
type AllRequiredCondition = Array<Privilege | {
	anyOf: Privilege[];
}>;
type AnalyticsServiceSetup = Omit<AnalyticsClient, "flush" | "shutdown">;
type AnalyticsServiceStart = Pick<AnalyticsClient, "optIn" | "reportEvent" | "telemetryCounter$">;
type AnyQuery = Query | AggregateQuery;
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
type AutoRefreshDoneFn = () => void;
type BackgroundSearchOpenedHandler = (attrs: {
	session: UISession;
	event: React$1.MouseEvent<HTMLAnchorElement>;
}) => void;
type BaseState = object;
type BrowserShortUrlClientFactoryCreateParams = null;
type BrowserUrlService = UrlService<BrowserShortUrlClientFactoryCreateParams, BrowserShortUrlClient>;
type BuildFlavor = "serverless" | "traditional";
type CalculateBoundsFn = (timeRange: TimeRange) => TimeRangeBounds;
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
type CloudUrls = CloudBasicUrls & CloudPrivilegedUrls;
type ConditionalTypeValue = string | number | boolean | object | null;
type ConfigSchema = TypeOf<typeof configSchema>;
type ConfigSchema$1 = TypeOf<typeof configSchema$1>;
type ConnectorsId = typeof SERVERLESS_ES_CONNECTORS_ID;
type ContentLinkId = "connectors" | "webCrawlers";
type CoreUserProfileDelegateContract = Omit<UserProfileService, "getUserProfile$" | "getEnabled$"> & {
	userProfile$: Observable<UserProfileData | null>;
	enabled$: Observable<boolean>;
};
type CreateAggConfigParams = Assign<AggConfigSerialized, {
	type: string | IAggType;
}>;
type CreateDevToolArgs = Omit<DevToolApp, "enable" | "disable" | "isDisabled"> & {
	disabled?: boolean;
};
type CustomComponent = () => Promise<React$1.ComponentType<CustomComponentProps>>;
type CustomStatusCheckCallback = () => Promise<boolean>;
type DataConnectorsApp = typeof DATA_CONNECTORS_APP_ID;
type DataViewFieldBase = {
	name: string;
	/**
	 * Kibana field type
	 */
	type: string;
	subType?: IFieldSubType;
	/**
	 * Scripted field painless script
	 */
	script?: string;
	/**
	 * Scripted field language
	 * Painless is the only valid scripted field language
	 */
	lang?: estypes.ScriptLanguage;
	scripted?: boolean;
	/**
	 * ES field types as strings array.
	 */
	esTypes?: string[];
};
type DataViewFieldBaseSpecMap = Record<string, DataViewFieldBase>;
type DataViewFieldMap = Record<string, FieldSpec>;
type DataViewFieldMap$1 = Record<string, DataViewField>;
type DataViewSavedObjectAttrs = Pick<DataViewAttributes, "title" | "type" | "typeMeta" | "name" | "timeFieldName">;
type DataViewSpec = {
	/**
	 * Saved object id (or generated id if in-memory only)
	 */
	id?: string;
	/**
	 * Saved object version string
	 */
	version?: string;
	/**
	 * Contrary to its name, this property sets the index pattern of the data view. (e.g. `logs-*,metrics-*`)
	 *
	 * Use the `name` property instead to set a human readable name for the data view.
	 */
	title?: string;
	/**
	 * Name of timestamp field
	 */
	timeFieldName?: string;
	/**
	 * List of filters which discover uses to hide fields
	 */
	sourceFilters?: SourceFilter[];
	/**
	 * Map of fields by name
	 */
	fields?: DataViewFieldMap;
	/**
	 * Metadata about data view, only used by rollup data views
	 */
	typeMeta?: TypeMeta$1;
	/**
	 * Default or rollup
	 */
	type?: string;
	/**
	 * Map of serialized field formats by field name
	 */
	fieldFormats?: Record<string, SerializedFieldFormat>;
	/**
	 * Map of runtime fields by field name
	 */
	runtimeFieldMap?: Record<string, RuntimeFieldSpec>;
	/**
	 * Map of field attributes by field name, currently customName and count
	 */
	fieldAttrs?: FieldAttrsAsObject;
	/**
	 * Determines whether failure to load field list should be reported as error
	 */
	allowNoIndex?: boolean;
	/**
	 * Array of namespace ids
	 */
	namespaces?: string[];
	/**
	 * Human readable name used to differentiate the data view.
	 */
	name?: string;
	/**
	 * Allow hidden and system indices when loading field list
	 */
	allowHidden?: boolean;
	/**
	 * Whether the data view is managed by the application.
	 */
	managed?: boolean;
};
type DataViewsContract = PublicMethodsOf<DataViewsService>;
type DataViewsContract$1 = DataViewsServicePublic;
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
type DefinedProperties<Base extends NullableProps> = Pick<Base, {
	[Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
}[keyof Base]>;
type DeprecationsDetails = ConfigDeprecationDetails | ApiDeprecationDetails | FeatureDeprecationDetails;
type DestructiveRouteMethod = "post" | "put" | "delete" | "patch";
type DomainDeprecationDetails<ExtendedDetails = DeprecationsDetails> = ExtendedDetails & {
	domainId: string;
};
type ESQLRow = unknown[];
type EmbedShare = ShareImplementationFactory<"embed", {
	anonymousAccess: AnonymousAccessServiceContract;
	shortUrlService: ReturnType<BrowserUrlService["shortUrls"]["get"]>;
}>;
type EmbedShareConfig = ShareImplementation<EmbedShare>;
type EmbedShareUIConfig = ShareActionUserInputBase<{
	embedUrlParamExtensions?: UrlParamExtension[];
	computeAnonymousCapabilities?: (anonymousUserCapabilities: Capabilities) => boolean;
	/**
	 * @deprecated use computeAnonymousCapabilities defined on objectTypeMeta config
	 */
	showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
}>;
type Ensure<T, X> = T extends X ? T : never;
type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;
type EnterpriseSearchAnalyticsApp = typeof ENTERPRISE_SEARCH_ANALYTICS_APP_ID;
type EnterpriseSearchApp = typeof ENTERPRISE_SEARCH_APP_ID;
type EnterpriseSearchApplicationsApp = typeof ENTERPRISE_SEARCH_APPLICATIONS_APP_ID;
type EnterpriseSearchContentApp = typeof ENTERPRISE_SEARCH_CONTENT_APP_ID;
type EnvironmentServiceSetup = ReturnType<EnvironmentService["setup"]>;
type EnvironmentSetup = EnvironmentServiceSetup;
type ErrorLike = SerializedError & {
	original?: SerializedError;
};
type EsQueryConfig = KueryQueryOptions & EsQueryFiltersConfig & {
	allowLeadingWildcards?: boolean;
	queryStringOptions?: SerializableRecord;
};
type EsQuerySortValue = Record<string, SortDirection | SortDirectionNumeric | SortDirectionFormat>;
type EvaluationContext = MultiContextEvaluationContext | SingleContextEvaluationContext;
type ExecutionContextStart = ExecutionContextSetup;
type ExportShareConfig = ShareImplementation<ExportShare>;
type ExportShareDerivativesConfig = ShareImplementation<ExportShareDerivatives>;
type ExportShareUIConfig = Record<string, ShareActionUserInputBase<{}>>;
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
type ExpressionValue = ExpressionValueUnboxed | ExpressionValueBoxed;
type ExpressionValueBoxed<Type extends string = string, Value extends object = object> = {
	type: Type;
} & Value;
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
type FatalErrorsStart = FatalErrorsSetup;
type FeatureCatalogueCategory = "admin" | "data" | "other";
type FeatureCatalogueRegistrySetup = ReturnType<FeatureCatalogueRegistry["setup"]>;
type FeatureCatalogueSetup = FeatureCatalogueRegistrySetup;
type FieldAttrSet = {
	/**
	 * Custom field label
	 */
	customLabel?: string;
	/**
	 * Custom field description
	 */
	customDescription?: string;
	/**
	 * Popularity count - used for discover
	 */
	count?: number;
};
type FieldAttrs = Map<string, FieldAttrSet>;
type FieldAttrsAsObject = Record<string, FieldAttrSet>;
type FieldFormatConfig = {
	id: FieldFormatId;
	params: FieldFormatParams;
	es?: boolean;
};
type FieldFormatConvertFunction = HtmlContextTypeConvert | TextContextTypeConvert;
type FieldFormatId = FIELD_FORMAT_IDS | string;
type FieldFormatInstanceType = (new (params?: FieldFormatParams, getConfig?: FieldFormatsGetConfigFn) => FieldFormat) & {
	id: FieldFormatId;
	title: string;
	hidden?: boolean;
	fieldType: string | string[];
};
type FieldFormatMap = Record<string, SerializedFieldFormat>;
type FieldFormatParams<P = {}> = SerializableRecord & P;
type FieldFormatsContentType = "html" | "text";
type FieldFormatsGetConfigFn<T extends Serializable = Serializable> = (key: string, defaultOverride?: T) => T;
type FieldFormatsStart = Omit<FieldFormatsRegistry, "init" | "register"> & {
	deserialize: FormatFactory;
};
type FieldFormatsStartCommon = Omit<FieldFormatsRegistry, "init" | "register">;
type FieldSpec = DataViewFieldBase & {
	/**
	 * Popularity count is used by discover
	 */
	count?: number;
	/**
	 * Description of field type conflicts across indices
	 */
	conflictDescriptions?: Record<string, string[]>;
	/**
	 * Field formatting in serialized format
	 */
	format?: SerializedFieldFormat;
	/**
	 * Elasticsearch field types used by backing indices
	 */
	esTypes?: string[];
	/**
	 * True if field is searchable
	 */
	searchable: boolean;
	/**
	 * True if field is aggregatable
	 */
	aggregatable: boolean;
	/**
	 * True if field is empty
	 */
	isNull?: boolean;
	/**
	 * True if can be read from doc values
	 */
	readFromDocValues?: boolean;
	/**
	 * True if field is indexed
	 */
	indexed?: boolean;
	/**
	 * Custom label for field, used for display in kibana
	 */
	customLabel?: string;
	/**
	 * Custom description for field, used for display in kibana
	 */
	customDescription?: string;
	/**
	 * Runtime field definition
	 */
	runtimeField?: RuntimeFieldSpec;
	/**
	 * list of allowed field intervals for the field
	 */
	fixedInterval?: string[];
	/**
	 * List of allowed timezones for the field
	 */
	timeZone?: string[];
	/**
	 * set to true if field is a TSDB dimension field
	 */
	timeSeriesDimension?: boolean;
	/**
	 * set if field is a TSDB metric field
	 */
	timeSeriesMetric?: estypes.MappingTimeSeriesMetricType;
	/**
	 * Whether short dots are enabled, based on uiSettings.
	 */
	shortDotsEnable?: boolean;
	/**
	 * Is this field in the mapping? False if a scripted or runtime field defined on the data view.
	 */
	isMapped?: boolean;
	/**
	 * Name of parent field for composite runtime field subfields.
	 */
	parentName?: string;
	defaultFormatter?: string;
	/**
	 * Indicates whether the field is a metadata field.
	 */
	metadata_field?: boolean;
};
type FieldTypes = KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | "*";
type FieldsForWildcardSpec = Omit<FieldSpec, "format" | "customLabel" | "runtimeField" | "count" | "customDescription">;
type Filter = {
	$state?: {
		store: FilterStateStore;
	};
	meta: FilterMeta;
	query?: Record<string, any>;
};
type FilterFieldFn = (field: DataViewField) => boolean;
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
type FormatFactory = <P = {}>(mapping?: SerializedFieldFormat<P>) => IFieldFormat;
type GenericBucket = estypes.AggregationsBuckets<any> & {
	[property: string]: estypes.AggregationsAggregate;
};
type GetConfigFn = <T = any>(key: string, defaultOverride?: T) => T;
type GetMigrationFunctionObjectFn = () => MigrateFunctionsObject;
type Headers$1 = {
	[header in KnownHeaders]?: string | string[] | undefined;
} & {
	[header: string]: string | string[] | undefined;
};
type HtmlContextTypeConvert = (value: any, options?: HtmlContextTypeOptions) => string;
type HttpProtocol = "http1" | "http2";
type HttpStart = HttpSetup;
type IAggConfig = AggConfig;
type IAggConfigs = AggConfigs;
type IAggType = AggType;
type IEsSearchResponse<Source = any> = IKibanaSearchResponse<estypes.SearchResponse<Source>>;
type IFieldFormat = FieldFormat;
type IFieldSubType = IFieldSubTypeMultiOptional | IFieldSubTypeNestedOptional;
type IFieldSubTypeMultiOptional = {
	multi?: {
		parent: string;
	};
};
type IFieldSubTypeNestedOptional = {
	nested?: {
		path: string;
	};
};
type ISearchGeneric = <SearchStrategyRequest extends IKibanaSearchRequest = IEsSearchRequest, SearchStrategyResponse extends IKibanaSearchResponse = IEsSearchResponse>(request: SearchStrategyRequest, options?: ISearchOptions) => Observable<SearchStrategyResponse>;
type ISearchRequestParams = {
	trackTotalHits?: boolean;
} & estypes.SearchRequest;
type ISearchSessionEBTManager = PublicContract<SearchSessionEBTManager>;
type ISearchSource = Pick<SearchSource, keyof SearchSource>;
type ISessionService = PublicContract<SessionService>;
type ISessionsClient = PublicContract<SessionsClient>;
type IShortUrlClientFactoryProvider<D, ShortUrlClient extends IShortUrlClient = IShortUrlClient> = (params: {
	locators: ILocatorClient;
}) => IShortUrlClientFactory<D, ShortUrlClient>;
type InjectedIntl = IntlShape;
type InputTimeRange = TimeRange | {
	from: moment$1.Moment | string;
	to: moment$1.Moment | string;
};
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
type KibanaProductTier = (typeof KIBANA_PRODUCT_TIERS)[KibanaSolution][number];
type KibanaProject = (typeof KIBANA_PROJECTS)[number];
type KibanaRequestRouteOptions<Method extends RouteMethod> = (Method extends "get" | "options" ? Required<Omit<RouteConfigOptions<Method>, "body">> : Required<RouteConfigOptions<Method>>) & {
	security?: RouteSecurity;
};
type KibanaSolution = (typeof KIBANA_SOLUTIONS)[number];
type KnownHeaders = KnownKeys<IncomingHttpHeaders>;
type KnownKeys<T> = StringKeysAsVals<T> extends {
	[_ in keyof T]: infer U;
} ? U : never;
type KueryNode = any;
type LabelValue = string | number | boolean;
type LastUsedLogsViewerApp = typeof LAST_USED_LOGS_VIEWER_APP_ID;
type LegacyIntegrationConfig = Omit<ShareLegacy, "config"> & {
	config: ReturnType<ShareLegacy["config"]>;
};
type LicenseCheckState = "unavailable" | "invalid" | "valid" | "expired";
type LicenseStatus = "active" | "invalid" | "expired";
type LicenseType = keyof typeof LICENSE_TYPE;
type LinkId = "searchprofiler" | "painless_lab" | "grokdebugger" | "console";
type LinkId$1 = "overview" | "anomalyDetection" | "anomalyExplorer" | "singleMetricViewer" | "dataDrift" | "dataFrameAnalytics" | "resultExplorer" | "analyticsMap" | "aiOps" | "logRateAnalysis" | "logPatternAnalysis" | "changePointDetections" | "modelManagement" | "nodesOverview" | "nodes" | "memoryUsage" | "esqlDataVisualizer" | "dataVisualizer" | "fileUpload" | "indexDataVisualizer" | "settings" | "calendarSettings" | "calendarSettings" | "filterListsSettings" | "notifications" | "suppliedConfigurations";
type LinkId$2 = `${SecurityPageName}`;
type LinkId$3 = "agents" | "policies" | "enrollment_tokens" | "uninstall_tokens" | "data_streams" | "settings";
type LinkId$4 = `${WorkflowsPageName}`;
type LinkShare = ShareImplementationFactory<"link", {
	shortUrlService: ReturnType<BrowserUrlService["shortUrls"]["get"]>;
}>;
type LinkShareConfig = ShareImplementation<LinkShare>;
type LinkShareUIConfig = ShareActionUserInputBase<{
	/**
	 *
	 * @description allows a consumer to provide a custom method which when invoked
	 * handles providing a share url in the context of said consumer
	 */
	delegatedShareUrlHandler?: () => Promise<string>;
}>;
type LocatorClientDependencies = LocatorDependencies;
type LocatorMigrationFunction = MigrateFunction<LocatorData, LocatorData>;
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
type MatchAllRangeFilter = Filter & {
	meta: RangeFilterMeta;
	query: {
		match_all: estypes.QueryDslQueryContainer["match_all"];
	};
};
type MaybePromise<T> = T | Promise<T>;
type MethodKeysOf<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
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
type MultiValueClickDataContext = MultiValueClickContext["data"];
type NotificationCoordinator = (registrar: string) => NotificationCoordinatorPublicApi;
type NowProviderInternalContract = PublicMethodsOf<NowProvider>;
type NowProviderPublicContract = Pick<NowProviderInternalContract, "get">;
type NullableProps = Record<string, Type<any> | undefined | null>;
type ObjectResultType<P extends Props> = Readonly<{
	[K in keyof OptionalProperties<P>]?: TypeOf<P[K]>;
} & {
	[K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
}>;
type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> & UnknownOptions & {
	meta?: TypeOptions<ObjectResultType<P>>["meta"] & ObjectTypeOptionsMeta;
};
type ObltProfilingApp = typeof OBLT_PROFILING_APP_ID;
type ObltUxApp = typeof OBLT_UX_APP_ID;
type ObservabilityLogsExplorerApp = typeof OBSERVABILITY_LOGS_EXPLORER_APP_ID;
type ObservabilityOnboardingApp = typeof OBSERVABILITY_ONBOARDING_APP_ID;
type ObservabilityOverviewApp = typeof OBSERVABILITY_OVERVIEW_APP_ID;
type ObservabilityOverviewLinkId = "alerts" | "cases" | "cases_configure" | "cases_create" | "rules";
type OnError = (error: Error, toastInputFields: ErrorToastOptions, key: string) => void;
type OnNotification = (toastInputFields: ToastInputFields, key: string) => void;
type OptionalProperties<Base extends Props> = Pick<Base, {
	[Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
}[keyof Base]>;
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
type PostFlightRequestFn<TAggConfig> = (resp: estypes.SearchResponse<any>, aggConfigs: IAggConfigs, aggConfig: TAggConfig, searchSource: ISearchSource, inspectorRequestAdapter?: RequestAdapter, abortSignal?: AbortSignal, searchSessionId?: string, disableWarningToasts?: boolean) => Promise<estypes.SearchResponse<any>>;
type PricingProduct = PricingProductSecurity | PricingProductObservability;
type Privilege = string;
type Privileges = Array<Privilege | PrivilegeSet>;
type ProfilingLinkId = "stacktraces" | "flamegraphs" | "functions";
type ProjectRouting = string | undefined;
type Props = Record<string, Type<any>>;
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
type PublicContract<T> = Pick<T, PublicKeys<T>>;
type PublicFeatures = Record<string, LicenseFeature>;
type PublicKeys<T> = keyof T;
type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;
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
type QueryState = {
	time?: TimeRange$1;
	refreshInterval?: RefreshInterval;
	filters?: Filter[];
	query?: Query | AggregateQuery;
};
type QueryState$ = Observable<{
	changes: QueryStateChange;
	state: QueryState;
}>;
type QueryStateChangePartial = {
	[P in keyof QueryState]?: boolean;
};
type QueryStringContract = PublicMethodsOf<QueryStringManager>;
type RangeFilter = Filter & {
	meta: RangeFilterMeta;
	query: {
		range: {
			[key: string]: RangeFilterParams;
		};
	};
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
type RefreshInterval = TypeOf<typeof refreshIntervalSchema>;
type RequiredProperties<Base extends Props> = Pick<Base, {
	[Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
}[keyof Base]>;
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
type RuntimeFieldBase = {
	/**
	 * Type of runtime field
	 */
	type: RuntimeType;
	/**
	 * Runtime field script
	 */
	script?: {
		/**
		 * Script source
		 */
		source: string;
	};
};
type RuntimeFieldSpec = RuntimeFieldBase & {
	/**
	 * Composite subfields
	 */
	fields?: Record<string, {
		type: RuntimePrimitiveTypes;
	}>;
};
type RuntimeFieldSubFields = Record<string, RuntimeFieldSubField>;
type RuntimePrimitiveTypes = Exclude<RuntimeType, "composite">;
type RuntimeType = (typeof RUNTIME_FIELD_TYPES)[number];
type SafeRouteMethod = "get" | "options";
type SanitizedConnectionRequestParams = Pick<ConnectionRequestParams, "method" | "path" | "querystring">;
type SavedObjectReference$1 = SavedObjectReference;
type SavedQueryTimeFilter = TimeRange$1 & {
	refreshInterval: RefreshInterval;
};
type ScriptedRangeFilter = Filter & {
	meta: RangeFilterMeta;
	query: {
		script: {
			script: estypes.Script;
		};
	};
};
type SearchField = estypes.QueryDslFieldAndFormat | estypes.Field;
type SearchFieldValue = SearchField & Serializable;
type SearchGettingStarted = typeof SEARCH_GETTING_STARTED;
type SearchHomepage = typeof SEARCH_HOMEPAGE;
type SearchIndexManagement = typeof SEARCH_INDEX_MANAGEMENT;
type SearchIndices = typeof SEARCH_INDICES;
type SearchIndicesLinkId = typeof SEARCH_INDICES_CREATE_INDEX;
type SearchInferenceEndpointsId = typeof SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID;
type SearchInferenceEndpointsLinkId = "inferenceEndpoints";
type SearchPlaygroundId = typeof ES_SEARCH_PLAYGROUND_ID;
type SearchQueryRulesId = typeof SEARCH_QUERY_RULES_ID;
type SearchRequest<T extends Record<string, any> = Record<string, any>> = {
	index?: DataView$1 | string;
	query?: Array<Query | AggregateQuery>;
	filters?: Filter[] | (() => Filter[]);
} & Omit<T, "index" | "query" | "filters">;
type SearchResponseWarning = SearchResponseIncompleteWarning;
type SearchSessionSavedObject = SavedObject<SearchSessionSavedObjectAttributes>;
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
type SerializedSearchSourceFields = {
	type?: string;
	/**
	 * {@link Query}
	 */
	query?: Query | AggregateQuery;
	/**
	 * {@link Filter}
	 */
	filter?: Filter[];
	/**
	 * Filters that should not trigger highlighting.
	 * These filters will be included in the search query for document retrieval,
	 * but excluded from the highlight_query parameter in Elasticsearch.
	 * {@link Filter}
	 */
	nonHighlightingFilters?: Filter[];
	/**
	 * {@link EsQuerySortValue}
	 */
	sort?: EsQuerySortValue[];
	highlight?: SerializableRecord;
	highlightAll?: boolean;
	trackTotalHits?: boolean | number;
	/**
	 * {@link AggConfigs}
	 */
	aggs?: AggConfigSerialized[];
	from?: number;
	size?: number;
	source?: boolean | estypes.Fields;
	version?: boolean;
	/**
	 * Retrieve fields via the search Fields API
	 */
	fields?: SearchFieldValue[];
	/**
	 * Retreive fields directly from _source (legacy behavior)
	 *
	 * @deprecated It is recommended to use `fields` wherever possible.
	 */
	fieldsFromSource?: estypes.Fields;
	/**
	 * {@link IndexPatternService}
	 */
	index?: string | DataViewSpec;
	searchAfter?: estypes.SortResults;
	timeout?: string;
	terminate_after?: number;
	/**
	 * {@link ProjectRouting}
	 */
	projectRouting?: ProjectRouting;
	parent?: SerializedSearchSourceFields;
};
type ServerlessWebCrawlers = typeof SERVERLESS_ES_WEB_CRAWLERS_ID;
type SessionStateContainer<SearchDescriptor = unknown, SearchMeta extends {} = {}> = StateContainer<SessionStateInternal<SearchDescriptor, SearchMeta>, SessionPureTransitions<SearchDescriptor, SearchMeta>, SessionPureSelectors<SearchDescriptor, SearchMeta>>;
type ShareActionConfigArgs = ShareContext & Pick<ShareRegistryApiStart, "anonymousAccessServiceProvider" | "urlService">;
type ShareActionIntents = LinkShare | EmbedShare | ShareLegacy | ShareIntegration;
type ShareActionUserInputBase<E extends Record<string, unknown> = Record<string, unknown>> = {
	/**
	 * The draft mode callout content to be shown when there are unsaved changes.
	 * - `true`: Shows the default callout.
	 * - `false` or `undefined`: Shows no callout.
	 * - `DraftModeCalloutProps`:
	 *   - `message`: callout message custom content
	 */
	draftModeCallOut?: boolean | DraftModeCalloutProps;
	helpText?: React$1.ReactNode;
	CTAButtonConfig?: {
		id: string;
		dataTestSubj: string;
		label: string;
	};
	disabled?: boolean;
} & E;
type ShareConfigs = LinkShareConfig | EmbedShareConfig | ShareIntegrationConfig | ExportShareConfig | ExportShareDerivativesConfig | LegacyIntegrationConfig;
type ShareImplementation<T> = Omit<T, "config"> & {
	config: T extends ShareImplementationFactory<ShareTypes, infer R> ? R : never;
};
type ShareImplementationFactory<T extends Omit<ShareTypes, "legacy">, C extends Record<string, unknown> = Record<string, unknown>> = T extends "integration" ? {
	id: string;
	groupId?: string;
	shareType: T;
	/**
	 * callback that yields the share configuration for the share as a promise, enables the possibility to dynamically fetch the share configuration
	 */
	config: (ctx: ShareActionConfigArgs) => Promise<C>;
	/**
	 * when provided, this method will be used to evaluate if this integration should be available,
	 * given the current license and capabilities of kibana
	 */
	prerequisiteCheck?: (args: {
		capabilities: Capabilities;
		objectType: ShareContext["objectType"];
		license?: ILicense;
	}) => boolean;
} : {
	shareType: T;
	config: (ctx: ShareActionConfigArgs) => C | null;
};
type ShareIntegration<IntegrationParameters extends Record<string, unknown> = Record<string, unknown>> = ShareImplementationFactory<"integration", IntegrationParameters>;
type ShareIntegrationConfig = ShareImplementation<ShareIntegration>;
type ShareMenuManagerStart = ReturnType<ShareMenuManager["start"]>;
type ShareMenuRegistrySetup = ReturnType<ShareRegistry["setup"]>;
type SharePublicStart = ShareMenuManagerStart & {
	/**
	 * Utilities to work with URL locators and short URLs.
	 */
	url: BrowserUrlService;
	/**
	 * Accepts serialized values for extracting a locator, migrating state from a provided version against
	 * the locator, then using the locator to navigate.
	 */
	navigate(options: RedirectOptions): void;
	/**
	 * method to get all available integrations
	 */
	availableIntegrations: ShareRegistry["availableIntegrations"];
};
type ShareTypes = "link" | "embed" | "legacy" | "integration";
type ShareableUrlLocatorParams = {
	timeRange: TimeRange | undefined;
} & Record<string, unknown>;
type SingleContextEvaluationContext = OpenFeatureEvaluationContext & {
	/**
	 * The sub-context that it's updated. Defaults to `kibana`.
	 */
	kind?: "organization" | "kibana";
};
type SloApp = typeof SLO_APP_ID;
type SolutionId = KibanaProject;
type SortDirectionFormat = {
	order: SortDirection;
	format?: string;
};
type SortDirectionNumeric = {
	order: SortDirection;
	numeric_type?: "double" | "long" | "date" | "date_nanos";
};
type SourceFilter = {
	value: string;
	clientId?: string | number;
};
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
type TextContextTypeConvert = (value: any, options?: TextContextTypeOptions) => string;
type ThemeServiceStart = ThemeServiceSetup;
type TimeHistoryContract = PublicMethodsOf<TimeHistory>;
type TimeRange = {
	from: string;
	to: string;
	mode?: "absolute" | "relative";
};
type TimeRange$1 = {
	from: string;
	to: string;
	mode?: "absolute" | "relative";
};
type TimeStateChange = "initial" | "shift" | "override";
type TimefilterContract = PublicMethodsOf<Timefilter>;
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
type TutorialDirectoryHeaderLinkComponent = React$1.FC;
type TutorialModuleNoticeComponent = React$1.FC<{
	moduleName: string;
}>;
type TutorialServiceSetup = ReturnType<TutorialService["setup"]>;
type TypeMeta$1 = {
	/**
	 * Aggregation restrictions for rollup fields
	 */
	aggs?: Record<string, AggregationRestrictions>;
	/**
	 * Params for retrieving rollup field data
	 */
	params?: {
		/**
		 * Rollup index name used for loading field list
		 */
		rollup_index: string;
	};
};
type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any> ? ReturnType<RT>["type"] : RT extends Type<any> ? RT["type"] : never;
type TypeOrLazyType = Type<any> | (() => Type<any>);
type UISearchSessionState = SearchSessionStatus;
type UiCounterMetricType = METRIC_TYPE.CLICK | METRIC_TYPE.LOADED | METRIC_TYPE.COUNT | string;
type UiSettingsScope = "namespace" | "global";
type UiSettingsSolutions = Array<SolutionId | "classic">;
type UiSettingsType = "undefined" | "json" | "markdown" | "number" | "select" | "boolean" | "string" | "array" | "image" | "color";
type Unit = "ms" | "s" | "m" | "h" | "d" | "w" | "M" | "y";
type UnmountCallback = () => void;
type UptimeApp = typeof UPTIME_APP_ID;
type UptimeLinkId = "Certificates";
type UrlForwardingStart = ReturnType<UrlForwardingPlugin["start"]>;
type UserProfileData = Record<string, unknown>;
type UserProfileLabels = Record<string, string>;
type UserProfileServiceStart = UserProfileService;
type WarningHandlerCallback = (warning: SearchResponseWarning, meta: {
	request: estypes.SearchRequest;
	response: estypes.SearchResponse;
	requestId: string | undefined;
}) => boolean | undefined;
type WelcomeRenderTelemetryNotice = () => null | JSX.Element;
type WorkplaceAIApp = typeof WORKPLACE_AI_APP_ID;

export {};
