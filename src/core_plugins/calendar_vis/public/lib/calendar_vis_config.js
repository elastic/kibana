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
import { BaseConfig } from './base_config';

export const VIS_CHART_TYPE = {
  HEATMAP_YEAR: 'heatmap_year'
};

const DEFAULT_VIS_CONFIG = {
  type: VIS_CHART_TYPE.HEATMAP_YEAR,
  style: {
    margin: { top: 10, right: 3, bottom: 5, left: 3 }
  },
  alerts: [],
  categoryAxes: [],
  valueAxes: [],
  grid: {}
};

export class CalendarVisConfig extends BaseConfig {
  constructor(visConfigArgs) {
    super(visConfigArgs);
    this._values = _.defaultsDeep({}, this._values, DEFAULT_VIS_CONFIG);
  }
}
