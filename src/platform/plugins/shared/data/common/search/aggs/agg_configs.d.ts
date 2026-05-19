import moment from 'moment-timezone';
import type { Assign } from '@kbn/utility-types';
import type { TimeRange, RangeFilter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import type { ISearchOptions, IEsSearchResponse } from '@kbn/search-types';
import type { ISearchSource } from '../../../public';
import type { AggConfigSerialized, IAggConfig } from './agg_config';
import { AggConfig } from './agg_config';
import type { IAggType } from './agg_type';
import type { AggTypesRegistryStart } from './agg_types_registry';
import type { AggTypesDependencies, GetConfigFn } from '../..';
export interface AggConfigsOptions {
    typesRegistry: AggTypesRegistryStart;
    hierarchical?: boolean;
    aggExecutionContext?: AggTypesDependencies['aggExecutionContext'];
    partialRows?: boolean;
    probability?: number;
    samplerSeed?: number;
}
export type CreateAggConfigParams = Assign<AggConfigSerialized, {
    type: string | IAggType;
}>;
export type GenericBucket = estypes.AggregationsBuckets<any> & {
    [property: string]: estypes.AggregationsAggregate;
};
/**
 * @name AggConfigs
 *
 * @description A "data structure"-like class with methods for indexing and
 * accessing instances of AggConfig. This should never be instantiated directly
 * outside of this plugin. Rather, downstream plugins should do this via
 * `createAggConfigs()`
 *
 * @internal
 */
export type IAggConfigs = AggConfigs;
export declare class AggConfigs {
    indexPattern: DataView;
    private opts;
    private getConfig;
    timeRange?: TimeRange;
    timeFields?: string[];
    forceNow?: Date;
    aggs: IAggConfig[];
    readonly timeZone: string;
    constructor(indexPattern: DataView, configStates: CreateAggConfigParams[] | undefined, opts: AggConfigsOptions, getConfig: GetConfigFn);
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
    getResolvedTimeRange(): import("../..").TimeRangeBounds | undefined;
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
    getTimeShifts(): Record<string, moment.Duration>;
    getTimeShiftInterval(): moment.Duration | undefined;
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
    toExpressionAst(): import("@kbn/expressions-plugin/common").ExpressionAstExpression;
}
