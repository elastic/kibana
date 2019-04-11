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
import { IndexedArray } from '../indexed_array';
import { AggConfig } from './agg_config';

function removeParentAggs(obj) {
  for(const prop in obj) {
    if (prop === 'parentAggs') delete obj[prop];
    else if (typeof obj[prop] === 'object') removeParentAggs(obj[prop]);
  }
}

function parseParentAggs(dslLvlCursor, dsl) {
  if (dsl.parentAggs) {
    _.each(dsl.parentAggs, (agg, key) => {
      dslLvlCursor[key] = agg;
      parseParentAggs(dslLvlCursor, agg);
    });
  }
}

class AggConfigs extends IndexedArray {
  constructor(indexPattern, configStates = [], schemas) {
    configStates = AggConfig.ensureIds(configStates);

    super({
      index: ['id'],
      group: ['schema.group', 'type.name', 'type.type', 'schema.name'],
    });

    this.indexPattern = indexPattern;
    this.schemas = schemas;

    configStates.forEach(params => this.createAggConfig(params));

    if (this.schemas) {
      this.initializeDefaultsFromSchemas(schemas);
    }
  }

  initializeDefaultsFromSchemas(schemas) {
    // Set the defaults for any schema which has them. If the defaults
    // for some reason has more then the max only set the max number
    // of defaults (not sure why a someone define more...
    // but whatever). Also if a schema.name is already set then don't
    // set anything.
    _(schemas)
      .filter(schema => {
        return Array.isArray(schema.defaults) && schema.defaults.length > 0;
      })
      .each(schema => {
        if (!this.bySchemaName[schema.name]) {
          const defaults = schema.defaults.slice(0, schema.max);
          _.each(defaults, defaultState => {
            const state = _.defaults({ id: AggConfig.nextId(this) }, defaultState);
            this.push(new AggConfig(this, state));
          });
        }
      })
      .commit();
  }

  setTimeRange(timeRange) {
    this.timeRange = timeRange;

    const updateAggTimeRange = (agg) => {
      _.each(agg.params, param => {
        if (param instanceof AggConfig) {
          updateAggTimeRange(param);
        }
      });
      if (_.get(agg, 'type.name') === 'date_histogram') {
        agg.params.timeRange = timeRange;
      }
    };

    this.forEach(updateAggTimeRange);
  }

  // clone method will reuse existing AggConfig in the list (will not create new instances)
  clone({ enabledOnly = true } = {}) {
    const filterAggs = (agg) => {
      if (!enabledOnly) return true;
      return agg.enabled;
    };
    const aggConfigs = new AggConfigs(this.indexPattern, this.raw.filter(filterAggs), this.schemas);
    return aggConfigs;
  }

  createAggConfig(params, { addToAggConfigs = true } = {}) {
    let aggConfig;
    if (params instanceof AggConfig) {
      aggConfig = params;
      params.parent = this;
    } else {
      aggConfig = new AggConfig(this, params);
    }
    if (addToAggConfigs) {
      this.push(aggConfig);
    }
    return aggConfig;
  }

  /**
   * Data-by-data comparison of this Aggregation
   * Ignores the non-array indexes
   * @param aggConfigs an AggConfigs instance
   */
  jsonDataEquals(aggConfigs) {
    if (aggConfigs.length !== this.length) {
      return false;
    }
    for (let i = 0; i < this.length; i += 1) {
      if (!_.isEqual(aggConfigs[i].toJSON(), this[i].toJSON())) {
        return false;
      }
    }
    return true;
  }

  toDsl(hierarchical = false) {
    const dslTopLvl = {};
    let dslLvlCursor;
    let nestedMetrics;

    if (hierarchical) {
      // collect all metrics, and filter out the ones that we won't be copying
      nestedMetrics = _(this.byTypeType.metrics)
        .filter(function (agg) {
          return agg.type.name !== 'count';
        })
        .map(agg => {
          return {
            config: agg,
            dsl: agg.toDsl(this)
          };
        })
        .value();
    }
    this.getRequestAggs()
      .filter(config => !config.type.hasNoDsl)
      .forEach((config, i, list) => {
        if (!dslLvlCursor) {
        // start at the top level
          dslLvlCursor = dslTopLvl;
        } else {
          const prevConfig = list[i - 1];
          const prevDsl = dslLvlCursor[prevConfig.id];

          // advance the cursor and nest under the previous agg, or
          // put it on the same level if the previous agg doesn't accept
          // sub aggs
          dslLvlCursor = prevDsl.aggs || dslLvlCursor;
        }

        const dsl = dslLvlCursor[config.id] = config.toDsl(this);
        let subAggs;

        parseParentAggs(dslLvlCursor, dsl);

        if (config.type.type === 'buckets' && i < list.length - 1) {
        // buckets that are not the last item in the list accept sub-aggs
          subAggs = dsl.aggs || (dsl.aggs = {});
        }

        if (subAggs && nestedMetrics) {
          nestedMetrics.forEach(agg => {
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

  getRequestAggs() {
    //collect all the aggregations
    const aggregations = this.reduce((requestValuesAggs, agg) => {
      const aggs = agg.getRequestAggs();
      return aggs ? requestValuesAggs.concat(aggs) : requestValuesAggs;
    }, []);
    //move metrics to the end
    return _.sortBy(aggregations, agg => agg.type.type === 'metrics' ? 1 : 0);
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
  getResponseAggs() {
    return this.getRequestAggs().reduce(function (responseValuesAggs, agg) {
      const aggs = agg.getResponseAggs();
      return aggs ? responseValuesAggs.concat(aggs) : responseValuesAggs;
    }, []);
  }


  /**
   * Find a response agg by it's id. This may be an agg in the aggConfigs, or one
   * created specifically for a response value
   *
   * @param  {string} id - the id of the agg to find
   * @return {AggConfig}
   */
  getResponseAggById(id) {
    id = String(id);
    const reqAgg = _.find(this.getRequestAggs(), function (agg) {
      return id.substr(0, String(agg.id).length) === agg.id;
    });
    if (!reqAgg) return;
    return _.find(reqAgg.getResponseAggs(), { id: id });
  }

  onSearchRequestStart(searchSource, searchRequest) {
    return Promise.all(
      this.getRequestAggs().map(agg =>
        agg.onSearchRequestStart(searchSource, searchRequest)
      )
    );
  }
}

export { AggConfigs };
