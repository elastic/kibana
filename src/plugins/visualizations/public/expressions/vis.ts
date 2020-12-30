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
import { VisParams, PersistedState } from '../../../../plugins/visualizations/public';

import { getTypes } from '../services';
import { VisType } from '../vis_types';

export interface ExprVisState {
  title?: string;
  type: VisType<unknown> | string;
  params?: VisParams;
}

export interface ExprVisAPIEvents {
  filter: (data: any) => void;
  brush: (data: any) => void;
  applyFilter: (data: any) => void;
}

export interface ExprVisAPI {
  events: ExprVisAPIEvents;
}

export class ExprVis extends EventEmitter {
  public title: string = '';
  public type: VisType<unknown>;
  public params: VisParams = {};
  public sessionState: Record<string, any> = {};
  public API: ExprVisAPI;
  public eventsSubject: any;
  private uiState: PersistedState;

  constructor(visState: ExprVisState = { type: 'histogram' }) {
    super();

    this.type = this.getType(visState.type);
    this.uiState = new PersistedState();
    this.setState(visState);

    this.API = {
      events: {
        filter: (data: any) => {
          if (!this.eventsSubject) return;
          this.eventsSubject.next({
            name: 'filterBucket',
            data: data.data
              ? {
                  data: data.data,
                  negate: data.negate,
                }
              : { data: [data] },
          });
        },
        brush: (data: any) => {
          if (!this.eventsSubject) return;
          this.eventsSubject.next({ name: 'brush', data });
        },
        applyFilter: (data: any) => {
          if (!this.eventsSubject) return;
          this.eventsSubject.next({ name: 'applyFilter', data });
        },
      },
    };
  }

  private getType(type: string | VisType<unknown>) {
    if (_.isString(type)) {
      const newType = getTypes().get(type);
      if (!newType) {
        throw new Error(`Invalid type "${type}"`);
      }
      return newType;
    } else {
      return type;
    }
  }

  setState(state: ExprVisState) {
    this.title = state.title || '';
    if (state.type) {
      this.type = this.getType(state.type);
    }
    this.params = _.defaultsDeep(
      {},
      _.cloneDeep(state.params || {}),
      _.cloneDeep(this.type.visConfig.defaults || {})
    );
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
    return !!this.uiState;
  }

  getUiState() {
    return this.uiState;
  }

  setUiState(state: PersistedState) {
    this.uiState = state;
  }

  /**
   * Currently this is only used to extract map-specific information
   * (e.g. mapZoom, mapCenter).
   */
  uiStateVal(key: string, val: any) {
    if (this.hasUiState()) {
      if (_.isUndefined(val)) {
        return this.uiState.get(key);
      }
      return this.uiState.set(key, val);
    }
    return val;
  }
}
