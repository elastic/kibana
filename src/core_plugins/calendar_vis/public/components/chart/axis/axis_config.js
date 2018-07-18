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
import { BaseConfig } from '../../../lib/base_config';
import { VIS_CHART_TYPE } from '../../../lib';
import { AXIS_SCALE_TYPE } from './axis_scale';

const DEFAULT_AXIS_CONFIG = {
  show: true,
  labels: {
    truncate: 3
  }
};

export class AxisConfig extends BaseConfig {
  constructor(axisConfigArgs, gridConfigArgs) {
    super(axisConfigArgs);
    this._values = _.defaultsDeep({}, this._values, DEFAULT_AXIS_CONFIG);
    this._values.isValidated = false;
    Object.keys(gridConfigArgs).forEach(arg => {
      this._values[arg] = gridConfigArgs[arg];
    });

    if(this._values.type === 'category') {
      if(this._values.scale.type === AXIS_SCALE_TYPE.MONTHS) {
        this._values.padding = this._values.cellSize * 3;
      }else if(this._values.scale.type === AXIS_SCALE_TYPE.WEEKS) {
        this._values.padding = this._values.cellSize * 1.05;
      }
    }
  }

  get(property, defaults) {
    if(!this._values.isValidated) {
      throw new Error('axis is not validated');
    }
    return super.get(property, defaults);
  }

  isPercentage() {
    return !!this._values.scale.mode && this._values.scale.mode === 'percentage';
  }

  validateAxis(chartType) {
    if(this._values.type === 'value') {
      this._values.isValidated = true;
      return;
    }
    const { position } = this._values;
    const { type } = this._values.scale;
    switch(chartType) {
      case VIS_CHART_TYPE.HEATMAP_YEAR:
        if(position === 'top') {
          if(type !== AXIS_SCALE_TYPE.MONTHS) {
            throw new TypeError(`axis of id: ${this._values.id} has invalid scale: ${type}`);
          }
        }else if(position === 'left') {
          if(type !== AXIS_SCALE_TYPE.WEEKS) {
            throw new TypeError(`axis of id: ${this._values.id} has invalid scale: ${type}`);
          }
        }
        break;
      default:
        break;
    }

    this._values.isValidated = true;
  }

}

