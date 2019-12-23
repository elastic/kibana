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

/**
 * @name AggConfig
 *
 * @extends IndexedArray
 *
 * @description A "data structure"-like class with methods for indexing and
 * accessing instances of AggConfig.
 */

import _ from 'lodash';
import { TimeRange } from 'src/plugins/data/public';
import { Schema } from '../vis/editors/default/schemas';
import { AggConfig, AggConfigOptions } from './agg_config';
import { AggGroupNames } from '../vis/editors/default/agg_groups';
import { IndexPattern } from '../../../core_plugins/data/public';
import { ISearchSource, FetchOptions } from '../courier/types';

type Schemas = Record<string, any>;

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

export class AggConfigs {
  public indexPattern: IndexPattern;
  public schemas: any;
  public timeRange?: TimeRange;

  aggs: AggConfig[];

  constructor(indexPattern: IndexPattern, configStates = [] as any, schemas?: any) {
    configStates = AggConfig.ensureIds(configStates);

    this.aggs = [];
    this.indexPattern = indexPattern;
    this.schemas = schemas;

    configStates.forEach((params: any) => this.createAggConfig(params));

    if (this.schemas) {
      this.initializeDefaultsFromSchemas(schemas);
    }
  }

  initializeDefaultsFromSchemas(schemas: Schemas) {
    // Set the defaults for any schema which has them. If the defaults
    // for some reason has more then the max only set the max number
    // of defaults (not sure why a someone define more...
    // but whatever). Also if a schema.name is already set then don't
    // set anything.
    _(schemas)
      .filter((schema: Schema) => {
        return Array.isArray(schema.defaults) && schema.defaults.length > 0;
      })
      .each((schema: any) => {
        if (!this.aggs.find((agg: AggConfig) => agg.schema && agg.schema.name === schema.name)) {
          const defaults = schema.defaults.slice(0, schema.max);
          _.each(defaults, defaultState => {
            const state = _.defaults({ id: AggConfig.nextId(this.aggs) }, defaultState);
            this.aggs.push(new AggConfig(this, state as AggConfigOptions));
          });
        }
      })
      .commit();
  }

  setTimeRange(timeRange: TimeRange) {
    this.timeRange = timeRange;

    const updateAggTimeRange = (agg: AggConfig) => {
      _.each(agg.params, param => {
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
    const aggConfigs = new AggConfigs(
      this.indexPattern,
      this.aggs.filter(filterAggs),
      this.schemas
    );
    return aggConfigs;
  }

  createAggConfig = <T extends AggConfig = AggConfig>(
    params: AggConfig | AggConfigOptions,
    { addToAggConfigs = true } = {}
  ) => {
    let aggConfig;
    if (params instanceof AggConfig) {
      aggConfig = params;
      params.parent = this;
    } else {
      aggConfig = new AggConfig(this, params);
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

  toDsl(hierarchical: boolean = false) {
    const dslTopLvl = {};
    let dslLvlCursor: Record<string, any>;
    let nestedMetrics: Array<{ config: AggConfig; dsl: any }> | [];

    if (hierarchical) {
      // collect all metrics, and filter out the ones that we won't be copying
      nestedMetrics = this.aggs
        .filter(function(agg) {
          return agg.type.type === 'metrics' && agg.type.name !== 'count';
        })
        .map(agg => {
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
    return this.aggs.find(agg => agg.id === id);
  }

  byName(name: string) {
    return this.aggs.filter(agg => agg.type.name === name);
  }

  byType(type: string) {
    return this.aggs.filter(agg => agg.type.type === type);
  }

  byTypeName(type: string) {
    return this.aggs.filter(agg => agg.type.name === type);
  }

  bySchemaName(schema: string) {
    return this.aggs.filter(agg => agg.schema && agg.schema.name === schema);
  }

  bySchemaGroup(group: string) {
    return this.aggs.filter(agg => agg.schema && agg.schema.group === group);
  }

  getRequestAggs(): AggConfig[] {
    // collect all the aggregations
    const aggregations = this.aggs
      .filter(agg => agg.enabled && agg.type)
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
    return this.getRequestAggs().reduce(function(responseValuesAggs, agg: AggConfig) {
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
    const reqAgg = _.find(this.getRequestAggs(), function(agg: AggConfig) {
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
