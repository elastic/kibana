/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import _, { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import { isRangeFilter } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  IEsSearchResponse,
  ISearchOptions,
  ISearchSource,
  RangeFilter,
} from 'src/plugins/data/public';
import { AggConfig, AggConfigSerialized, IAggConfig } from './agg_config';
import { IAggType } from './agg_type';
import { AggTypesRegistryStart } from './agg_types_registry';
import { AggGroupNames } from './agg_groups';
import { IndexPattern } from '../..';
import { TimeRange, getTime, calculateBounds } from '../../../common';
import { IBucketAggConfig } from './buckets';
import { insertTimeShiftSplit, mergeTimeShifts } from './utils/time_splits';

function removeParentAggs(obj: any) {
  for (const prop in obj) {
    if (prop === 'parentAggs') delete obj[prop];
    else if (typeof obj[prop] === 'object') {
      const hasParentAggsKey = 'parentAggs' in obj[prop];
      removeParentAggs(obj[prop]);
      // delete object if parentAggs was the last key
      if (hasParentAggsKey && Object.keys(obj[prop]).length === 0) {
        delete obj[prop];
      }
    }
  }
}

function parseParentAggs(dslLvlCursor: any, dsl: any) {
  if (dsl.parentAggs) {
    _.each(dsl.parentAggs, (agg, key) => {
      dslLvlCursor[key as string] = agg;
      parseParentAggs(dslLvlCursor, agg);
    });
  }
}

export interface AggConfigsOptions {
  typesRegistry: AggTypesRegistryStart;
  hierarchical?: boolean;
}

export type CreateAggConfigParams = Assign<AggConfigSerialized, { type: string | IAggType }>;

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

// TODO need to make a more explicit interface for this
export type IAggConfigs = AggConfigs;

export class AggConfigs {
  public indexPattern: IndexPattern;
  public timeRange?: TimeRange;
  public timeFields?: string[];
  public forceNow?: Date;
  public hierarchical?: boolean = false;

  private readonly typesRegistry: AggTypesRegistryStart;

  aggs: IAggConfig[];

  constructor(
    indexPattern: IndexPattern,
    configStates: CreateAggConfigParams[] = [],
    opts: AggConfigsOptions
  ) {
    this.typesRegistry = opts.typesRegistry;

    configStates = AggConfig.ensureIds(configStates);

    this.aggs = [];
    this.indexPattern = indexPattern;
    this.hierarchical = opts.hierarchical;

    configStates.forEach((params: any) => this.createAggConfig(params));
  }

  setTimeFields(timeFields: string[] | undefined) {
    this.timeFields = timeFields;
  }

  setForceNow(now: Date | undefined) {
    this.forceNow = now;
  }

  setTimeRange(timeRange: TimeRange) {
    this.timeRange = timeRange;

    const updateAggTimeRange = (agg: AggConfig) => {
      _.each(agg.params, (param) => {
        if (param instanceof AggConfig) {
          updateAggTimeRange(param);
        }
      });
      if (_.get(agg, 'type.name') === 'date_histogram') {
        agg.params.timeRange = timeRange;
      }
    };

    this.aggs.forEach(updateAggTimeRange);
  }

  /**
   * Returns the current time range as moment instance (date math will get resolved using the current "now" value or system time if not set)
   * @returns Current time range as resolved date.
   */
  getResolvedTimeRange() {
    return (
      this.timeRange &&
      calculateBounds(this.timeRange, {
        forceNow: this.forceNow,
      })
    );
  }

  // clone method will reuse existing AggConfig in the list (will not create new instances)
  clone({ enabledOnly = true } = {}) {
    const filterAggs = (agg: AggConfig) => {
      if (!enabledOnly) return true;
      return agg.enabled;
    };

    const aggConfigs = new AggConfigs(this.indexPattern, this.aggs.filter(filterAggs), {
      typesRegistry: this.typesRegistry,
    });

    return aggConfigs;
  }

  createAggConfig = <T extends AggConfig = AggConfig>(
    params: CreateAggConfigParams,
    { addToAggConfigs = true } = {}
  ) => {
    const { type } = params;
    const getType = (t: string) => {
      const typeFromRegistry = this.typesRegistry.get(t);

      if (!typeFromRegistry) {
        throw new Error(
          i18n.translate('data.search.aggs.error.aggNotFound', {
            defaultMessage: 'Unable to find a registered agg type for "{type}".',
            values: { type: type as string },
          })
        );
      }

      return typeFromRegistry;
    };

    let aggConfig;
    if (params instanceof AggConfig) {
      aggConfig = params;
      params.parent = this;
    } else {
      aggConfig = new AggConfig(this, {
        ...params,
        type: typeof type === 'string' ? getType(type) : type,
      });
    }

    if (addToAggConfigs) {
      this.aggs.push(aggConfig);
    }

    return aggConfig as T;
  };

  /**
   * Data-by-data comparison of this Aggregation
   * Ignores the non-array indexes
   * @param aggConfigs an AggConfigs instance
   */
  jsonDataEquals(aggConfigs: AggConfig[]) {
    if (aggConfigs.length !== this.aggs.length) {
      return false;
    }
    for (let i = 0; i < this.aggs.length; i += 1) {
      if (!_.isEqual(aggConfigs[i].toJSON(), this.aggs[i].toJSON())) {
        return false;
      }
    }
    return true;
  }

  toDsl(): Record<string, any> {
    const dslTopLvl = {};
    let dslLvlCursor: Record<string, any>;
    let nestedMetrics: Array<{ config: AggConfig; dsl: Record<string, any> }> | [];

    const timeShifts = this.getTimeShifts();
    const hasMultipleTimeShifts = Object.keys(timeShifts).length > 1;

    if (this.hierarchical) {
      if (hasMultipleTimeShifts) {
        throw new Error('Multiple time shifts not supported for hierarchical metrics');
      }
      // collect all metrics, and filter out the ones that we won't be copying
      nestedMetrics = this.aggs
        .filter(function (agg) {
          return agg.type.type === 'metrics' && agg.type.name !== 'count';
        })
        .map((agg) => {
          return {
            config: agg,
            dsl: agg.toDsl(this),
          };
        });
    }
    const requestAggs = this.getRequestAggs();
    const aggsWithDsl = requestAggs.filter((agg) => !agg.type.hasNoDsl).length;
    const timeSplitIndex = this.getAll().findIndex(
      (config) => 'splitForTimeShift' in config.type && config.type.splitForTimeShift(config, this)
    );

    requestAggs.forEach((config: AggConfig, i: number, list) => {
      if (!dslLvlCursor) {
        // start at the top level
        dslLvlCursor = dslTopLvl;
      } else {
        const prevConfig: AggConfig = list[i - 1];
        const prevDsl = dslLvlCursor[prevConfig.id];

        // advance the cursor and nest under the previous agg, or
        // put it on the same level if the previous agg doesn't accept
        // sub aggs
        dslLvlCursor = prevDsl?.aggs || dslLvlCursor;
      }

      if (hasMultipleTimeShifts) {
        dslLvlCursor = insertTimeShiftSplit(this, config, timeShifts, dslLvlCursor);
      }

      if (config.type.hasNoDsl) {
        return;
      }

      const dsl = config.type.hasNoDslParams
        ? config.toDsl(this)
        : (dslLvlCursor[config.id] = config.toDsl(this));
      let subAggs: any;

      parseParentAggs(dslLvlCursor, dsl);

      if (
        config.type.type === AggGroupNames.Buckets &&
        (i < aggsWithDsl - 1 || timeSplitIndex > i)
      ) {
        // buckets that are not the last item in the list of dsl producing aggs or have a time split coming up accept sub-aggs
        subAggs = dsl.aggs || (dsl.aggs = {});
      }

      if (subAggs) {
        _.each(subAggs, (agg) => {
          parseParentAggs(subAggs, agg);
        });
      }
      if (subAggs && nestedMetrics) {
        nestedMetrics.forEach((agg: any) => {
          subAggs[agg.config.id] = agg.dsl;
          // if a nested metric agg has parent aggs, we have to add them to every level of the tree
          // to make sure "bucket_path" references in the nested metric agg itself are still working
          if (agg.dsl.parentAggs) {
            Object.entries(agg.dsl.parentAggs).forEach(([parentAggId, parentAgg]) => {
              subAggs[parentAggId] = parentAgg;
            });
          }
        });
      }
    });

    removeParentAggs(dslTopLvl);
    return dslTopLvl;
  }

  getAll() {
    return [...this.aggs];
  }

  byIndex(index: number) {
    return this.aggs[index];
  }

  byId(id: string) {
    return this.aggs.find((agg) => agg.id === id);
  }

  byName(name: string) {
    return this.aggs.filter((agg) => agg.type?.name === name);
  }

  byType(type: string) {
    return this.aggs.filter((agg) => agg.type?.type === type);
  }

  byTypeName(type: string) {
    return this.byName(type);
  }

  bySchemaName(schema: string) {
    return this.aggs.filter((agg) => agg.schema === schema);
  }

  getRequestAggs(): AggConfig[] {
    // collect all the aggregations
    const aggregations = this.aggs
      .filter((agg) => agg.enabled && agg.type)
      .reduce((requestValuesAggs, agg: AggConfig) => {
        const aggs = agg.getRequestAggs();
        return aggs ? requestValuesAggs.concat(aggs) : requestValuesAggs;
      }, [] as AggConfig[]);
    // move metrics to the end
    return _.sortBy(aggregations, (agg: AggConfig) =>
      agg.type.type === AggGroupNames.Metrics ? 1 : 0
    );
  }

  getTimeShifts(): Record<string, moment.Duration> {
    const timeShifts: Record<string, moment.Duration> = {};
    this.getAll()
      .filter((agg) => agg.schema === 'metric')
      .map((agg) => agg.getTimeShift())
      .forEach((timeShift) => {
        if (timeShift) {
          timeShifts[String(timeShift.asMilliseconds())] = timeShift;
        } else {
          timeShifts[0] = moment.duration(0);
        }
      });
    return timeShifts;
  }

  getTimeShiftInterval(): moment.Duration | undefined {
    const splitAgg = (
      this.getAll().filter((agg) => agg.type.type === AggGroupNames.Buckets) as IBucketAggConfig[]
    ).find((agg) => agg.type.splitForTimeShift(agg, this));
    return splitAgg?.type.getTimeShiftInterval(splitAgg);
  }

  hasTimeShifts(): boolean {
    return this.getAll().some((agg) => agg.hasTimeShift());
  }

  getSearchSourceTimeFilter(forceNow?: Date) {
    if (!this.timeFields || !this.timeRange) {
      return [];
    }
    const timeRange = this.timeRange;
    const timeFields = this.timeFields;
    const timeShifts = this.getTimeShifts();
    if (!this.hasTimeShifts()) {
      return this.timeFields
        .map((fieldName) => getTime(this.indexPattern, timeRange, { fieldName, forceNow }))
        .filter(isRangeFilter);
    }
    return [
      {
        meta: {
          index: this.indexPattern?.id,
          params: {},
          alias: '',
          disabled: false,
          negate: false,
        },
        query: {
          bool: {
            should: Object.entries(timeShifts).map(([, shift]) => {
              return {
                bool: {
                  filter: timeFields
                    .map(
                      (fieldName) =>
                        [
                          getTime(this.indexPattern, timeRange, { fieldName, forceNow }),
                          fieldName,
                        ] as [RangeFilter | undefined, string]
                    )
                    .filter(([filter]) => isRangeFilter(filter))
                    .map(([filter, field]) => ({
                      range: {
                        [field]: {
                          format: 'strict_date_optional_time',
                          gte: moment(filter?.query.range[field].gte).subtract(shift).toISOString(),
                          lte: moment(filter?.query.range[field].lte).subtract(shift).toISOString(),
                        },
                      },
                    })),
                },
              };
            }),
            minimum_should_match: 1,
          },
        },
      },
    ];
  }

  postFlightTransform(response: IEsSearchResponse<any>) {
    if (!this.hasTimeShifts()) {
      return response;
    }
    const transformedRawResponse = cloneDeep(response.rawResponse);
    if (!transformedRawResponse.aggregations) {
      transformedRawResponse.aggregations = {
        doc_count: response.rawResponse.hits?.total as estypes.AggregationsAggregate,
      };
    }
    const aggCursor = transformedRawResponse.aggregations!;

    mergeTimeShifts(this, aggCursor);
    return {
      ...response,
      rawResponse: transformedRawResponse,
    };
  }

  getRequestAggById(id: string) {
    return this.aggs.find((agg: AggConfig) => agg.id === id);
  }

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
  getResponseAggs(): AggConfig[] {
    return this.getRequestAggs().reduce(function (responseValuesAggs, agg: AggConfig) {
      const aggs = agg.getResponseAggs();
      return aggs ? responseValuesAggs.concat(aggs) : responseValuesAggs;
    }, [] as AggConfig[]);
  }

  /**
   * Find a response agg by it's id. This may be an agg in the aggConfigs, or one
   * created specifically for a response value
   *
   * @param  {string} id - the id of the agg to find
   * @return {AggConfig}
   */
  getResponseAggById(id: string): AggConfig | undefined {
    id = String(id);
    const reqAgg = _.find(this.getRequestAggs(), function (agg: AggConfig) {
      const aggId = String(agg.id);
      // only multi-value aggs like percentiles are allowed to contain dots and [
      const isMultiValueId = id.includes('[') || id.includes('.');
      if (!isMultiValueId) {
        return id === aggId;
      }
      const baseId = id.substring(0, id.indexOf('[') !== -1 ? id.indexOf('[') : id.indexOf('.'));
      return baseId === aggId;
    });
    if (!reqAgg) return;
    return _.find(reqAgg.getResponseAggs(), { id });
  }

  onSearchRequestStart(searchSource: ISearchSource, options?: ISearchOptions) {
    return Promise.all(
      // @ts-ignore
      this.getRequestAggs().map((agg: AggConfig) => agg.onSearchRequestStart(searchSource, options))
    );
  }
}
