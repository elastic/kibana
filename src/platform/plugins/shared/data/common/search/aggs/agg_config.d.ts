import moment from 'moment';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Assign, Ensure } from '@kbn/utility-types';
import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchSource } from '../../../public';
import type { IAggType } from './agg_type';
import type { IAggConfigs } from './agg_configs';
/** @public **/
export type AggConfigSerialized = Ensure<{
    type: string;
    enabled?: boolean;
    id?: string;
    params?: {} | SerializableRecord;
    schema?: string;
}, SerializableRecord>;
export type AggConfigOptions = Assign<AggConfigSerialized, {
    type: IAggType;
}>;
/**
 * @name AggConfig
 *
 * @description This class represents an aggregation, which is displayed in the left-hand nav of
 * the Visualize app.
 */
export type IAggConfig = AggConfig;
export declare class AggConfig {
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
    getTimeShift(): undefined | moment.Duration;
    write(aggs?: IAggConfigs): Record<string, any>;
    isFilterable(): boolean;
    createFilter(key: string, params?: {}): any;
    /**
     *  Hook for pre-flight logic, see AggType#onSearchRequestStart
     *  @param {SearchSource} searchSource
     *  @param {ISearchOptions} options
     *  @return {Promise<undefined>}
     */
    onSearchRequestStart(searchSource: ISearchSource, options?: ISearchOptions): Promise<any[]> | Promise<void>;
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
    getAggParams(): import("./param_types/agg").AggParamType<AggConfig>[];
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
    getIndexPattern(): import("@kbn/kql/server/data_views").DataView;
    getTimeRange(): import("@kbn/es-query").TimeRange | undefined;
    fieldName(): any;
    fieldIsTimeField(): boolean;
    get type(): IAggType;
    set type(type: IAggType);
    setType(type: IAggType): void;
}
