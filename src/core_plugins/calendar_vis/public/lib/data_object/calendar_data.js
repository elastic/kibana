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
import { getLabels } from './labels';
import { colorProvider } from './color/color';

export function calendarDataObjectProvider(config) {
  const color = colorProvider(config);

  class CalendarDataObject {
    constructor(data, uiState) {
      this.uiState = uiState;
      this.data = this.copyDataObj(data);
      this.type = this.getDataType();

      this.labels = this._getLabels(this.data);
      this.color = this.labels ? color(this.labels, uiState.get('vis.colors')) : undefined;
      this._normalizeOrdered();
    }

    get(thing, def) {
      const source = (this.data.rows || this.data.columns || [this.data])[0];
      return _.get(source, thing, def);
    }

    getData() {
      const source = (this.data.rows || this.data.columns);
      return source;
    }

    dataAt(index) {
      const source = (this.data.rows || this.data.columns);
      const length = source.length;
      if(index < 0 || index >= length) {
        throw new Error(`Array index out of bounds, invalid index ${index}`);
      }else {
        return source[index];
      }
    }

    copyDataObj(data) {
      const copyChart = data => {
        const newData = {};
        Object.keys(data).forEach(key => {
          if (key !== 'series') {
            newData[key] = data[key];
          } else {
            newData[key] = data[key].map(seri => {
              return {
                label: seri.label,
                aggLabel: seri.aggLabel,
                aggId: seri.aggId,
                values: seri.values.map(val => {
                  const newVal = _.clone(val);
                  newVal.aggConfig = val.aggConfig;
                  newVal.aggConfigResult = val.aggConfigResult;
                  newVal.extraMetrics = val.extraMetrics;
                  newVal.series = val.series || seri.label;
                  return newVal;
                })
              };
            });
          }
        });
        return newData;
      };

      if (!data.series) {
        const newData = {};
        Object.keys(data).forEach(key => {
          if (!['rows', 'columns'].includes(key)) {
            newData[key] = data[key];
          }
          else {
            newData[key] = data[key].map(chart => {
              return copyChart(chart);
            });
          }
        });
        return newData;
      }
      return copyChart(data);
    }

    _getLabels(data) {
      return getLabels(data);
    }

    getDataType() {
      const data = this.getVisData();
      let type;

      data.forEach(function (obj) {
        if (obj.series) {
          type = 'series';
        } else if (obj.slices) {
          type = 'slices';
        } else if (obj.geoJson) {
          type = 'geoJson';
        }
      });

      return type;
    }

    getVisData() {
      let visData;

      if (this.data.rows) {
        visData = this.data.rows;
      } else if (this.data.columns) {
        visData = this.data.columns;
      } else {
        visData = [this.data];
      }

      return visData;
    }

    getColorFunc() {
      const defaultColors = this.uiState.get('vis.defaultColors');
      const overwriteColors = this.uiState.get('vis.colors');
      const colors = defaultColors ? _.defaults({}, overwriteColors, defaultColors) : overwriteColors;
      return color(this._getLabels(this.data), colors);
    }

    chartData() {
      if (!this.data.series) {
        const arr = this.data.rows ? this.data.rows : this.data.columns;
        return _.toArray(arr);
      }
      return [this.data];
    }

    _normalizeOrdered() {
      const data = this.getVisData();
      const self = this;

      data.forEach(function (d) {
        if (!d.ordered || !d.ordered.date) return;

        const missingMin = d.ordered.min == null;
        const missingMax = d.ordered.max == null;

        if (missingMax || missingMin) {
          const extent = d3.extent(self.xValues());
          if (missingMin) d.ordered.min = extent[0];
          if (missingMax) d.ordered.max = extent[1];
        }
      });
    }
  }

  return CalendarDataObject;

}
