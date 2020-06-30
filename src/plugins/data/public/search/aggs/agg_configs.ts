/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { Assign } from '@kbn/utility-types';

import { AggConfig, AggConfigSerialized, IAggConfig } from './agg_config';
import { IAggType } from './agg_type';
import { AggTypesRegistryStart } from './agg_types_registry';
import { AggGroupNames } from './agg_groups';
import { IndexPattern } from '../../index_patterns';
import { ISearchSource } from '../search_source';
import { FetchOptions } from '../fetch';
import { TimeRange } from '../../../common';

function removeParentAggs(obj: any) {
  for (const prop in obj) {
    if (prop === 'parentAggs') delete obj[prop];
    else if (typeof obj[prop] === 'object') removeParentAggs(obj[prop]);
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
}

export type CreateAggConfigParams = Assign<AggConfigSerialized, { type: string | IAggType }>;

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

    configStates.forEach((params: any) => this.createAggConfig(params));
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
    let aggConfig;

    if (params instanceof AggConfig) {
      aggConfig = params;
      params.parent = this;
    } else {
      aggConfig = new AggConfig(this, {
        ...params,
        type: typeof type === 'string' ? this.typesRegistry.get(type) : type,
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

  toDsl(hierarchical: boolean = false): Record<string, any> {
    const dslTopLvl = {};
    let dslLvlCursor: Record<string, any>;
    let nestedMetrics: Array<{ config: AggConfig; dsl: Record<string, any> }> | [];

    if (hierarchical) {
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
    this.getRequestAggs()
      .filter((config: AggConfig) => !config.type.hasNoDsl)
      .forEach((config: AggConfig, i: number, list) => {
        if (!dslLvlCursor) {
          // start at the top level
          dslLvlCursor = dslTopLvl;
        } else {
          const prevConfig: AggConfig = list[i - 1];
          const prevDsl = dslLvlCursor[prevConfig.id];

          // advance the cursor and nest under the previous agg, or
          // put it on the same level if the previous agg doesn't accept
          // sub aggs
          dslLvlCursor = prevDsl.aggs || dslLvlCursor;
        }

        const dsl = (dslLvlCursor[config.id] = config.toDsl(this));
        let subAggs: any;

        parseParentAggs(dslLvlCursor, dsl);

        if (config.type.type === AggGroupNames.Buckets && i < list.length - 1) {
          // buckets that are not the last item in the list accept sub-aggs
          subAggs = dsl.aggs || (dsl.aggs = {});
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

  onSearchRequestStart(searchSource: ISearchSource, options?: FetchOptions) {
    return Promise.all(
      // @ts-ignore
      this.getRequestAggs().map((agg: AggConfig) => agg.onSearchRequestStart(searchSource, options))
    );
  }
}
