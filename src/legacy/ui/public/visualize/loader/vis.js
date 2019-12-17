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
import { PersistedState } from '../../persisted_state';

import { start as visualizations } from '../../../../core_plugins/visualizations/public/np_ready/public/legacy';

const visTypes = visualizations.types;

export class Vis extends EventEmitter {
  constructor(visState = { type: 'histogram' }) {
    super();

    this._setUiState(new PersistedState());
    this.setState(visState);

    // Session state is for storing information that is transitory, and will not be saved with the visualization.
    // For instance, map bounds, which depends on the view port, browser window size, etc.
    this.sessionState = {};

    this.API = {
      events: {
        filter: data => {
          if (!this.eventsSubject) return;
          this.eventsSubject.next({ name: 'filterBucket', data });
        },
        brush: data => {
          if (!this.eventsSubject) return;
          this.eventsSubject.next({ name: 'brush', data });
        },
      },
    };
  }

  setState(state) {
    this.title = state.title || '';
    const type = state.type || this.type;
    if (_.isString(type)) {
      this.type = visTypes.get(type);
      if (!this.type) {
        throw new Error(`Invalid type "${type}"`);
      }
    } else {
      this.type = type;
    }

    this.params = _.defaultsDeep(
      {},
      _.cloneDeep(state.params || {}),
      _.cloneDeep(this.type.visConfig.defaults || {})
    );
  }

  setCurrentState(state) {
    this.setState(state);
  }

  getState() {
    return {
      title: this.title,
      type: this.type.name,
      params: _.cloneDeep(this.params),
    };
  }

  updateState() {
    this.emit('update');
  }

  forceReload() {
    this.emit('reload');
  }

  isHierarchical() {
    if (_.isFunction(this.type.hierarchicalData)) {
      return !!this.type.hierarchicalData(this);
    } else {
      return !!this.type.hierarchicalData;
    }
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
