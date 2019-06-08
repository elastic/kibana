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
import d3 from 'd3';
import { SCALE_MODES } from './scale_modes';

const defaults = {
  show: true,
  type: 'value',
  elSelector: '.visAxis__column--{pos} .axis-div',
  position: 'left',
  scale: {
    type: 'linear',
    expandLastBucket: true,
    inverted: false,
    setYExtents: null,
    defaultYExtents: null,
    min: null,
    max: null,
    mode: SCALE_MODES.NORMAL
  },
  style: {
    color: '#ddd',
    lineWidth: '1px',
    opacity: 1,
    tickColor: '#ddd',
    tickWidth: '1px',
    tickLength: '6px',
    rangePadding: 0.1,
    rangeOuterPadding: 0
  },
  labels: {
    axisFormatter: null,
    show: true,
    rotate: 0,
    rotateAnchor: 'center',
    filter: false,
    color: '#ddd',
    font: '"Open Sans", "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '8pt',
    truncate: 100
  },
  title: {
    text: '',
    elSelector: '.visAxis__column--{pos} .axis-div',
  }
};

const categoryDefaults = {
  type: 'category',
  position: 'bottom',
};

const valueDefaults = {
  labels: {
    axisFormatter: d3.format('n')
  }
};

const horizontalDefaults = {
  labels: {
    rotate: 0,
    rotateAnchor: 'end',
    filter: true,
    truncate: 0,
  }
};

const verticalDefaults = {
  labels: {
    rotateAnchor: 'middle'
  }
};

export class AxisConfig {
  constructor(chartConfig, axisConfigArgs) {
    const isCategoryType = axisConfigArgs.type === 'category';
    const typeDefaults = isCategoryType ? _.cloneDeep(categoryDefaults) : _.cloneDeep(valueDefaults);
    // _.defaultsDeep mutates axisConfigArgs nested values so we clone it first
    const axisConfigArgsClone = _.cloneDeep(axisConfigArgs);
    const isCategoryAxis = axisConfigArgsClone.type === 'category';
    const isHorizontal = axisConfigArgsClone.position && ['top', 'bottom'].includes(axisConfigArgsClone.position);

    _.merge(typeDefaults, isHorizontal || isCategoryAxis ? horizontalDefaults : verticalDefaults);
    this._values = _.defaultsDeep({}, axisConfigArgsClone, typeDefaults, defaults);

    this._values.elSelector = this._values.elSelector.replace('{pos}', this._values.position);
    this._values.rootEl = chartConfig.get('el');

    this.data = chartConfig.data;
    if (isCategoryAxis) {
      if (!this._values.values) {
        this.values = this.data.xValues(chartConfig.get('orderBucketsBySum', false));
        this.ordered = this.data.get('ordered');
      } else {
        this.values = this._values.values;
      }
      if (!this._values.labels.axisFormatter) {
        this._values.labels.axisFormatter = this.data.data.xAxisFormatter || this.data.get('xAxisFormatter');
      }
    }

    if (this.get('type') === 'value') {
      const isWiggleOrSilhouette =
        this.get('scale.mode') === SCALE_MODES.WIGGLE ||
        this.get('scale.mode') === SCALE_MODES.SILHOUETTE;
      // if show was not explicitly set and wiggle or silhouette option was checked
      if (isWiggleOrSilhouette) {
        this._values.scale.defaultYExtents = false;

        if (!axisConfigArgs.show) {
          this._values.show = false;
          this._values.title.show = true;
        }
      }

      // override axisFormatter (to replicate current behaviour)
      if (this.isPercentage()) {
        this._values.labels.axisFormatter = d3.format('%');
      }

      if (this.isLogScale()) {
        this._values.labels.filter = true;
      }
    }

    if (axisConfigArgs.title == null || axisConfigArgs.title.text == null) {
      const label = isCategoryAxis ? 'xAxisLabel' : 'yAxisLabel';
      this.set('title.text', this.data.get(label));
    }

    // horizontal axis with ordinal scale should have labels rotated (so we can fit more)
    // unless explicitly overridden by user
    if (this.isHorizontal() && this.isOrdinal()) {
      this._values.labels.filter = _.get(axisConfigArgs, 'labels.filter', false);
      this._values.labels.rotate = _.get(axisConfigArgs, 'labels.rotate', 90);
      this._values.labels.truncate = _.get(axisConfigArgs, 'labels.truncate', 100);
    }

    if (this.get('type') === 'category' && !this.isHorizontal()) {
      this._values.scale.inverted = _.get(axisConfigArgs, 'scale.inverted', true);
    }

    let offset;
    let stacked = true;
    switch (this.get('scale.mode')) {
      case SCALE_MODES.NORMAL:
        offset = 'zero';
        stacked = false;
        break;
      case SCALE_MODES.GROUPED:
        offset = 'group';
        stacked = false;
        break;
      case SCALE_MODES.PERCENTAGE:
        offset = function expand(data) {
          // taken from https://github.com/d3/d3/blob/v3.5.6/src/layout/stack.js#L193
          // fixed to support zeros
          const n = data.length;
          const m = data[0].length;
          const y0 = [];

          for (let j = 0; j < m; ++j) {
            let o = 0;
            for (let i = 0; i < n; i++) {
              o += data[i][j][1];
            }
            if (o) {
              for (let i = 0; i < n; i++) {
                data[i][j][1] /= o;
              }
            }
          }
          for (let j = 0; j < m; ++j) {
            y0[j] = 0;
          }
          return y0;
        };
        break;
      default:
        offset = this.get('scale.mode');
    }
    this.set('scale.offset', _.get(axisConfigArgs, 'scale.offset', offset));
    /* axis.scale.stacked means that axis stacking function should be run */
    this.set('scale.stacked', stacked);
  }

  get(property, defaults) {
    if (typeof defaults === 'undefined' && !_.has(this._values, property)) {
      throw new Error(`Accessing invalid config property: ${property}`);
    }
    const val = _.get(this._values, property, defaults);
    if (val == null && defaults != null) return defaults;
    return val;
  }

  set(property, value) {
    return _.set(this._values, property, value);
  }

  isHorizontal() {
    return (this._values.position === 'top' || this._values.position === 'bottom');
  }

  isOrdinal() {
    return !!this.values && (!this.isTimeDomain());
  }

  isTimeDomain() {
    return this.ordered && this.ordered.date;
  }

  isPercentage() {
    return this._values.scale.mode === SCALE_MODES.PERCENTAGE;
  }

  isUserDefined() {
    return this._values.scale.setYExtents;
  }

  isYExtents() {
    return this._values.scale.defaultYExtents;
  }

  isLogScale() {
    return this.getScaleType() === 'log';
  }

  getScaleType() {
    return this._values.scale.type;
  }
}
