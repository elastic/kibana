/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import _, { cloneDeep, isArray } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';
import {
  Aggregate,
  Bucket,
  FiltersAggregate,
  FiltersBucketItem,
} from '@elastic/elasticsearch/api/types';

import { IEsSearchResponse, ISearchOptions, ISearchSource } from 'src/plugins/data/public';
import { AggConfig, AggConfigSerialized, IAggConfig } from './agg_config';
import { IAggType } from './agg_type';
import { AggTypesRegistryStart } from './agg_types_registry';
import { AggGroupNames } from './agg_groups';
import { IndexPattern } from '../../index_patterns/index_patterns/index_pattern';
import { TimeRange } from '../../../common';

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

type GenericBucket = Bucket & { [property: string]: Aggregate };

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
    const hasTimeShifts = Object.keys(timeShifts).length > 0;

    if (this.hierarchical) {
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
    this.getRequestAggs().forEach((config: AggConfig, i: number, list) => {
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

      if (hasTimeShifts) {
        dslLvlCursor = this.insertTimeShiftSplit(config, timeShifts, dslLvlCursor);
      }

      if (config.type.hasNoDsl) {
        return;
      }

      const dsl = config.type.hasNoDslParams
        ? config.toDsl(this)
        : (dslLvlCursor[config.id] = config.toDsl(this));
      let subAggs: any;

      parseParentAggs(dslLvlCursor, dsl);

      if (config.type.type === AggGroupNames.Buckets && i < list.length - 1) {
        // buckets that are not the last item in the list accept sub-aggs
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

  private insertTimeShiftSplit(
    config: AggConfig,
    timeShifts: Record<string, moment.Duration>,
    dslLvlCursor: Record<string, any>
  ) {
    if (this.isTimeShiftSplitAgg(config)) {
      const filters: Record<string, unknown> = {};
      // TODO validate this
      const timeField = this.timeFields![0];
      filters['0'] = {
        range: {
          [timeField]: {
            // only works if there is a time range
            gte: this.timeRange!.from,
            lte: this.timeRange!.to,
          },
        },
      };
      Object.entries(timeShifts).forEach(([key, shift]) => {
        filters[key] = {
          range: {
            [timeField]: {
              // only works if there is a time range
              gte: moment(this.timeRange!.from).subtract(shift).toISOString(),
              lte: moment(this.timeRange!.to).subtract(shift).toISOString(),
            },
          },
        };
      });
      dslLvlCursor.time_offset_split = {
        filters: {
          filters,
        },
        aggs: {},
      };

      dslLvlCursor = dslLvlCursor.time_offset_split.aggs;
    }
    return dslLvlCursor;
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
        }
      });
    return timeShifts;
  }

  hasTimeShifts(): boolean {
    const timeShifts: Record<string, moment.Duration> = {};
    this.getAll()
      .filter((agg) => agg.schema === 'metric')
      .map((agg) => agg.getTimeShift())
      .forEach((timeShift) => {
        if (timeShift) {
          timeShifts[String(timeShift.asMilliseconds())] = timeShift;
        }
      });
    return Object.keys(timeShifts).length > 0;
  }

  isTimeShiftSplitAgg(aggConfig: AggConfig) {
    // TODO - probably abstract this in an optional flag on the agg config instead of hard-coding the relationship here
    const hasDateHistograms = this.getAll().some((agg) => agg.type.name === 'date_histogram');
    // the first date histogram or the first metric (if there are no date histograms) is the level to add the time shift filter split
    return (
      (hasDateHistograms && aggConfig.type.name === 'date_histogram') ||
      this.byType('metrics')[0] === aggConfig
    );
  }

  postFlightTransform(response: IEsSearchResponse<any>) {
    const timeShifts = this.getTimeShifts();
    if (Object.keys(timeShifts).length === 0) {
      return response;
    }
    const transformedRawResponse = cloneDeep(response.rawResponse);
    const aggCursor = transformedRawResponse.aggregations!;

    const bucketAggs = this.aggs.filter((agg) => agg.type.type === AggGroupNames.Buckets);

    const mergeAggLevel = (
      target: GenericBucket,
      source: GenericBucket,
      shiftKey: string,
      aggIndex: number
    ) => {
      Object.entries(source).forEach(([key, val]) => {
        // copy over doc count into special key
        if (typeof val === 'number' && key === 'doc_count') {
          target[`doc_count_${shiftKey}`] = val;
        } else if (typeof val !== 'object') {
          // other meta keys not of interest
          return;
        } else {
          // a sub-agg
          const agg = this.byId(key);
          if (agg && agg.type.type === 'metrics') {
            const timeShift = agg.getTimeShift();
            if (timeShift && String(timeShift.asMilliseconds()) === shiftKey) {
              // this is a metric from the current time shift, copy it over
              target[key] = source[key];
            }
          } else if (agg === bucketAggs[aggIndex]) {
            // expected next bucket sub agg
            const subAggregate = val as Aggregate;
            const baseSubAggregate = target[key] as Aggregate;
            // only supported bucket formats in agg configs are array of buckets and record of buckets for filters
            const buckets = ('buckets' in subAggregate ? subAggregate.buckets : undefined) as
              | GenericBucket[]
              | Record<string, GenericBucket>
              | undefined;
            const baseBuckets = ('buckets' in baseSubAggregate
              ? baseSubAggregate.buckets
              : undefined) as GenericBucket[] | Record<string, GenericBucket> | undefined;
            // merge
            if (isArray(buckets) && isArray(baseBuckets)) {
              buckets.forEach((bucket, index) =>
                mergeAggLevel(baseBuckets[index], bucket, shiftKey, aggIndex + 1)
              );
            } else if (baseBuckets && buckets && !isArray(baseBuckets)) {
              Object.entries(buckets).forEach(([bucketKey, bucket]) =>
                mergeAggLevel(baseBuckets[bucketKey], bucket, shiftKey, aggIndex + 1)
              );
            }
          }
        }
      });
    };
    const transformTimeShift = (cursor: Record<string, Aggregate>, aggIndex: number): undefined => {
      if (cursor.time_offset_split) {
        const timeShiftedBuckets = (cursor.time_offset_split as FiltersAggregate).buckets as Record<
          string,
          FiltersBucketItem
        >;
        const subTree = timeShiftedBuckets['0'];
        Object.keys(timeShifts).forEach((key) => {
          mergeAggLevel(
            subTree as GenericBucket,
            timeShiftedBuckets[key] as GenericBucket,
            key,
            aggIndex
          );
        });

        delete cursor.time_offset_split;
        Object.assign(cursor, subTree);
        return;
      }
      // recurse deeper into the response object
      Object.keys(cursor).forEach((subAggId) => {
        const subAgg = cursor[subAggId];
        if (typeof subAgg !== 'object' || !('buckets' in subAgg)) {
          return;
        }
        if (isArray(subAgg.buckets)) {
          subAgg.buckets.forEach((bucket) => transformTimeShift(bucket, aggIndex + 1));
        } else {
          Object.values(subAgg.buckets).forEach((bucket) =>
            transformTimeShift(bucket, aggIndex + 1)
          );
        }
      });
    };
    transformTimeShift(aggCursor, 0);
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
      return id.substr(0, String(agg.id).length) === agg.id;
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
