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
 *  - Aggs: Instances of AggConfig.
 *  - Params: The settings in the Options tab.
 *
 * Not to be confused with vislib/vis.js.
 */

import { EventEmitter } from 'events';
import _ from 'lodash';
import { VisTypesRegistryProvider } from '../registry/vis_types';
import { AggConfigs } from './agg_configs';
import { PersistedState } from '../persisted_state';
import { FilterBarQueryFilterProvider } from '../filter_manager/query_filter';
import { updateVisualizationConfig } from './vis_update';
import { SearchSourceProvider } from '../courier/search_source';
import { SavedObjectsClientProvider } from '../saved_objects';

import { timefilter } from '../timefilter';
import '../bind';

export function VisProvider(Private, indexPatterns, getAppState) {
  const visTypes = Private(VisTypesRegistryProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const SearchSource = Private(SearchSourceProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  class Vis extends EventEmitter {
    constructor(indexPattern, visState) {
      super();
      visState = visState || {};

      if (_.isString(visState)) {
        visState = {
          type: visState
        };
      }
      this.indexPattern = indexPattern;
      this._setUiState(new PersistedState());
      this.setCurrentState(visState);
      this.setState(this.getCurrentState(), false);

      // Session state is for storing information that is transitory, and will not be saved with the visualization.
      // For instance, map bounds, which depends on the view port, browser window size, etc.
      this.sessionState = {};

      this.API = {
        savedObjectsClient: savedObjectsClient,
        SearchSource: SearchSource,
        indexPatterns: indexPatterns,
        timeFilter: timefilter,
        queryFilter: queryFilter,
        events: {
          filter: data => this.eventsSubject.next({ name: 'filterBucket', data }),
          brush: data => this.eventsSubject.next({ name: 'brush', data }),
        },
        getAppState,
      };
    }

    setCurrentState(state) {
      this.title = state.title || '';
      const type = state.type || this.type;
      if (_.isString(type)) {
        this.type = visTypes.byName[type];
        if (!this.type) {
          throw new Error(`Invalid type "${type}"`);
        }
      } else {
        this.type = type;
      }

      this.params = _.defaults({},
        _.cloneDeep(state.params || {}),
        _.cloneDeep(this.type.visConfig.defaults || {})
      );

      updateVisualizationConfig(state.params, this.params);

      if (state.aggs || !this.aggs) {
        this.aggs = new AggConfigs(this.indexPattern, state.aggs, this.type.schemas.all);
      }
    }

    setState(state, updateCurrentState = true) {
      this._state = _.cloneDeep(state);
      if (updateCurrentState) {
        this.setCurrentState(this._state);
      }
    }

    updateState() {
      this.setState(this.getCurrentState(true));
      this.emit('update');
    }

    forceReload() {
      this.emit('reload');
    }

    getCurrentState(includeDisabled) {
      return {
        title: this.title,
        type: this.type.name,
        params: _.cloneDeep(this.params),
        aggs: this.aggs
          .map(agg => agg.toJSON())
          .filter(agg => includeDisabled || agg.enabled)
          .filter(Boolean)
      };
    }

    getSerializableState(state) {
      return {
        title: state.title,
        type: state.type,
        params: _.cloneDeep(state.params),
        aggs: state.aggs
          .map(agg => agg.toJSON())
          .filter(agg => agg.enabled)
          .filter(Boolean)
      };
    }

    copyCurrentState(includeDisabled = false) {
      const state = this.getCurrentState(includeDisabled);
      state.aggs = new AggConfigs(this.indexPattern, state.aggs, this.type.schemas.all);
      return state;
    }

    getStateInternal(includeDisabled) {
      return {
        title: this._state.title,
        type: this._state.type,
        params: this._state.params,
        aggs: this._state.aggs
          .filter(agg => includeDisabled || agg.enabled)
      };
    }

    getEnabledState() {
      return this.getStateInternal(false);
    }

    getAggConfig() {
      return this.aggs.clone({ enabledOnly: true });
    }

    getState() {
      return this.getStateInternal(true);
    }

    isHierarchical() {
      if (_.isFunction(this.type.hierarchicalData)) {
        return !!this.type.hierarchicalData(this);
      } else {
        return !!this.type.hierarchicalData;
      }
    }

    hasSchemaAgg(schemaName, aggTypeName) {
      const aggs = this.aggs.bySchemaName[schemaName] || [];
      return aggs.some(function (agg) {
        if (!agg.type || !agg.type.name) return false;
        return agg.type.name === aggTypeName;
      });
    }

    hasUiState() {
      return !!this.__uiState;
    }

    /***
     * this should not be used outside of visualize
     * @param uiState
     * @private
     */
    _setUiState(uiState) {
      if (uiState instanceof PersistedState) {
        this.__uiState = uiState;
      }
    }

    getUiState() {
      return this.__uiState;
    }

    /**
     * Currently this is only used to extract map-specific information
     * (e.g. mapZoom, mapCenter).
     */
    uiStateVal(key, val) {
      if (this.hasUiState()) {
        if (_.isUndefined(val)) {
          return this.__uiState.get(key);
        }
        return this.__uiState.set(key, val);
      }
      return val;
    }
  }

  Vis.prototype.type = 'histogram';

  return Vis;
}
