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
 * @name Vis
 *
 * @description This class consists of aggs, params, listeners, title, and type.
 *  - Aggs: Instances of IAggConfig.
 *  - Params: The settings in the Options tab.
 *
 * Not to be confused with vislib/vis.js.
 */

import { EventEmitter } from 'events';
import _ from 'lodash';
import { PersistedState } from '../../../../../../../src/plugins/visualizations/public';
// @ts-ignore
import { updateVisualizationConfig } from './legacy/vis_update';
import { getTypes, getAggs } from './services';
import { VisType } from './vis_types';
import { IAggConfigs, IndexPattern, ISearchSource } from '../../../../../../plugins/data/public';
import { AggConfigOptions } from '../../../../../../plugins/data/public/search/aggs/agg_config';

export interface SerializedVisData {
  expression?: string;
  aggs: AggConfigOptions[];
  indexPattern?: string;
  searchSource?: ISearchSource;
}

export interface SerializedVis {
  title: string;
  description?: string;
  type: string;
  params: VisParams;
  uiState?: any;
  data: SerializedVisData;
}

export interface VisData {
  ast?: string;
  aggs?: IAggConfigs;
  indexPattern?: IndexPattern;
  searchSource?: ISearchSource;
}

export interface VisParams {
  [key: string]: any;
}

export class Vis extends EventEmitter {
  public readonly type: VisType;
  public title: string = '';
  public description: string = '';
  public params: VisParams = {};
  // Session state is for storing information that is transitory, and will not be saved with the visualization.
  // For instance, map bounds, which depends on the view port, browser window size, etc.
  public sessionState: Record<string, any> = {};
  public data: VisData = {};

  public readonly uiState: PersistedState;

  constructor(visType: string, visState: SerializedVis = {} as any) {
    super();

    this.type = getTypes().get(visType);
    if (!this.type) {
      throw new Error(`Invalid type "${visType}"`);
    }

    this.uiState = new PersistedState(visState.uiState);

    this.setState(visState || {});
  }

  setState(state: SerializedVis) {
    this.title = state.title || '';
    this.description = state.description || '';

    this.params = _.defaults(
      {},
      _.cloneDeep(state.params || {}),
      _.cloneDeep(this.type.visConfig.defaults || {})
    );

    // move to migration script
    updateVisualizationConfig(state.params, this.params);

    if (state.data.searchSource) {
      this.data.searchSource = state.data.searchSource!;
      this.data.indexPattern = this.data.searchSource.getField('index');
    }
    if (state.data.aggs) {
      let configStates = state.data.aggs;
      configStates = this.initializeDefaultsFromSchemas(configStates, this.type.schemas.all || []);
      if (!this.data.indexPattern) {
        if (state.data.aggs.length) {
          throw new Error('trying to initialize aggs without index pattern');
        }
        return;
      }
      this.data.aggs = getAggs().createAggConfigs(this.data.indexPattern, configStates);
    }
  }

  clone() {
    return new Vis(this.type.name, this.serialize());
  }

  serialize(): SerializedVis {
    const aggs = this.data.aggs ? this.data.aggs.aggs.map(agg => agg.toJSON()) : [];
    const indexPattern = this.data.searchSource && this.data.searchSource.getField('index');
    return {
      title: this.title,
      type: this.type.name,
      params: _.cloneDeep(this.params) as any,
      uiState: this.uiState.getChanges(),
      data: {
        aggs: aggs as any,
        indexPattern: indexPattern ? indexPattern.id : undefined,
        searchSource: this.data.searchSource!.createCopy(),
      },
    };
  }

  toAST() {
    return this.type.toAST(this.params);
  }

  // deprecated
  isHierarchical() {
    if (_.isFunction(this.type.hierarchicalData)) {
      return !!this.type.hierarchicalData(this);
    } else {
      return !!this.type.hierarchicalData;
    }
  }

  private initializeDefaultsFromSchemas(configStates: AggConfigOptions[], schemas: any) {
    // Set the defaults for any schema which has them. If the defaults
    // for some reason has more then the max only set the max number
    // of defaults (not sure why a someone define more...
    // but whatever). Also if a schema.name is already set then don't
    // set anything.
    const newConfigs = [...configStates];
    schemas
      .filter((schema: any) => Array.isArray(schema.defaults) && schema.defaults.length > 0)
      .filter((schema: any) => !configStates.find(agg => agg.schema && agg.schema === schema.name))
      .forEach((schema: any) => {
        const defaults = schema.defaults.slice(0, schema.max);
        defaults.forEach((d: any) => newConfigs.push(d));
      });
    return newConfigs;
  }
}
