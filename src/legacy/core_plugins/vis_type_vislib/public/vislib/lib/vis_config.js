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
 * Provides vislib configuration, throws error if invalid property is accessed without providing defaults
 */
import _ from 'lodash';
import { vislibTypesConfig as visTypes } from './types';
import { Data } from './data';

const DEFAULT_VIS_CONFIG = {
  style: {
    margin: { top: 10, right: 3, bottom: 5, left: 3 },
  },
  alerts: [],
  categoryAxes: [],
  valueAxes: [],
  grid: {},
};

export class VisConfig {
  constructor(visConfigArgs, data, uiState, el, vislibColor) {
    this.data = new Data(data, uiState, vislibColor);

    const visType = visTypes[visConfigArgs.type];
    const typeDefaults = visType(visConfigArgs, this.data);
    this._values = _.defaultsDeep({}, typeDefaults, DEFAULT_VIS_CONFIG);
    this._values.el = el;
  }

  get(property, defaults) {
    if (_.has(this._values, property) || typeof defaults !== 'undefined') {
      return _.get(this._values, property, defaults);
    } else {
      throw new Error(`Accessing invalid config property: ${property}`);
      return defaults;
    }
  }

  set(property, value) {
    return _.set(this._values, property, value);
  }
}
