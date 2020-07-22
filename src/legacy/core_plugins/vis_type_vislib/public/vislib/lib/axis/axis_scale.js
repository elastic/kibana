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

import d3 from 'd3';
import _ from 'lodash';
import moment from 'moment';

import { InvalidLogScaleValues } from '../../errors';
import { timeTicks } from './time_ticks';

export class AxisScale {
  constructor(axisConfig, visConfig) {
    this.axisConfig = axisConfig;
    this.visConfig = visConfig;

    if (this.axisConfig.get('type') === 'category') {
      this.values = this.axisConfig.values;
      this.ordered = this.axisConfig.ordered;
    }
  }

  getScaleType() {
    return this.axisConfig.getScaleType();
  }

  validateUserExtents(domain) {
    const config = this.axisConfig;
    return domain.map((val) => {
      val = parseFloat(val);
      if (isNaN(val)) throw new Error(val + ' is not a valid number');
      if (config.isPercentage() && config.isUserDefined()) return val / 100;
      return val;
    });
  }

  getTimeDomain(data) {
    return [this.minExtent(data), this.maxExtent(data)];
  }

  minExtent(data) {
    return this.calculateExtent(data || this.values, 'min');
  }

  maxExtent(data) {
    return this.calculateExtent(data || this.values, 'max');
  }

  calculateExtent(data, extent) {
    const ordered = this.ordered;
    const opts = [ordered[extent]];

    let point = d3[extent](data);
    if (this.axisConfig.get('scale.expandLastBucket') && extent === 'max') {
      point = this.addInterval(point);
    }
    opts.push(point);

    return d3[extent](
      opts.reduce(function (opts, v) {
        if (!_.isNumber(v)) v = +v;
        if (!isNaN(v)) opts.push(v);
        return opts;
      }, [])
    );
  }

  addInterval(x) {
    return this.modByInterval(x, +1);
  }

  subtractInterval(x) {
    return this.modByInterval(x, -1);
  }

  modByInterval(x, n) {
    const ordered = this.ordered;
    if (!ordered) return x;
    const interval = ordered.interval;
    if (!interval) return x;

    if (!ordered.date) {
      return (x += ordered.interval * n);
    }

    const y = moment(x);
    const method = n > 0 ? 'add' : 'subtract';

    _.times(Math.abs(n), function () {
      y[method](interval);
    });

    return y.valueOf();
  }

  getAllPoints() {
    const config = this.axisConfig;
    const data = this.visConfig.data.chartData();
    const chartPoints = _.reduce(
      data,
      (chartPoints, chart, chartIndex) => {
        const points = chart.series.reduce((points, seri, seriIndex) => {
          const seriConfig = this.visConfig.get(`charts[${chartIndex}].series[${seriIndex}]`);
          const matchingValueAxis =
            !!seriConfig.valueAxis && seriConfig.valueAxis === config.get('id');
          const isFirstAxis = config.get('id') === this.visConfig.get('valueAxes[0].id');

          if (matchingValueAxis || (!seriConfig.valueAxis && isFirstAxis)) {
            const axisPoints = seri.values.map((val) => {
              if (val.y0) {
                return val.y0 + val.y;
              }
              return val.y;
            });
            return points.concat(axisPoints);
          }
          return points;
        }, []);
        return chartPoints.concat(points);
      },
      []
    );

    return chartPoints;
  }

  getYMin() {
    return d3.min(this.getAllPoints());
  }

  getYMax() {
    return d3.max(this.getAllPoints());
  }

  getExtents() {
    if (this.axisConfig.get('type') === 'category') {
      if (this.axisConfig.isTimeDomain()) return this.getTimeDomain(this.values);
      if (this.axisConfig.isOrdinal()) return this.values;
    }

    const min = this.axisConfig.get('scale.min', this.getYMin());
    const max = this.axisConfig.get('scale.max', this.getYMax());
    const domain = [min, max];
    if (this.axisConfig.isUserDefined()) return this.validateUserExtents(domain);
    if (this.axisConfig.isLogScale()) return this.logDomain(min, max);
    if (this.axisConfig.isYExtents()) {
      const scaleBoundsMargin = this.axisConfig.get('scale.boundsMargin');
      if (scaleBoundsMargin === 0) {
        return domain;
      } else {
        if (max < 0) {
          domain[1] = domain[1] + scaleBoundsMargin;
        }
        if (min > 0) {
          domain[0] = domain[0] - scaleBoundsMargin;
        }
        return domain;
      }
    }
    return [Math.min(0, min), Math.max(0, max)];
  }

  getDomain(length) {
    const domain = this.getExtents();
    const pad = this.axisConfig.get('padForLabels');
    if (pad > 0 && this.canApplyNice()) {
      const domainLength = domain[1] - domain[0];
      const valuePerPixel = domainLength / length;
      const padValue = valuePerPixel * pad;
      if (domain[0] < 0) {
        domain[0] -= padValue;
      }
      domain[1] += padValue;
    }
    return domain;
  }

  getRange(length) {
    if (this.axisConfig.isHorizontal()) {
      return !this.axisConfig.get('scale.inverted') ? [0, length] : [length, 0];
    } else {
      return this.axisConfig.get('scale.inverted') ? [0, length] : [length, 0];
    }
  }

  throwCustomError(message) {
    throw new Error(message);
  }

  throwLogScaleValuesError() {
    throw new InvalidLogScaleValues();
  }

  logDomain(min, max) {
    if (min < 0 || max < 0) return this.throwLogScaleValuesError();
    return [1, max];
  }

  getD3Scale(scaleTypeArg) {
    let scaleType = scaleTypeArg || 'linear';
    if (scaleType === 'square root') scaleType = 'sqrt';

    if (this.axisConfig.isTimeDomain()) {
      return d3.time.scale.utc(); // allow time scale
    }
    if (this.axisConfig.isOrdinal()) return d3.scale.ordinal();
    if (typeof d3.scale[scaleType] !== 'function') {
      return this.throwCustomError(`Axis.getScaleType: ${scaleType} is not a function`);
    }

    return d3.scale[scaleType]();
  }

  canApplyNice() {
    const config = this.axisConfig;
    return (
      !config.isUserDefined() &&
      !config.isYExtents() &&
      !config.isOrdinal() &&
      !config.isTimeDomain()
    );
  }

  getScale(length) {
    const config = this.axisConfig;
    const scale = this.getD3Scale(config.getScaleType());
    const domain = this.getDomain(length);
    const range = this.getRange(length);
    const padding = config.get('style.rangePadding');
    const outerPadding = config.get('style.rangeOuterPadding');
    this.scale = scale.domain(domain);

    if (config.isOrdinal()) {
      this.scale.rangeBands(range, padding, outerPadding);
    } else {
      this.scale.range(range);
    }

    if (this.canApplyNice()) this.scale.nice();
    // Prevents bars from going off the chart when the y extents are within the domain range
    if (this.scale.clamp) this.scale.clamp(true);

    this.validateScale(this.scale);

    if (this.axisConfig.isTimeDomain()) {
      this.scale.timezoneCorrectedTicks = timeTicks(scale);
    }

    return this.scale;
  }

  validateScale(scale) {
    if (!scale || _.isNaN(scale)) throw new Error('scale is ' + scale);
  }
}
