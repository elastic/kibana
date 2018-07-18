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

import moment from 'moment';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';

export { getHeatmapColors };

export function getMonthInterval(startDate, endDate) {
  const startMonth = parseInt(moment(startDate).format('MM'));
  const endMonth = parseInt(moment(endDate).format('MM'));
  return [startMonth, endMonth];
}

export const getTimeFormat = () => 'MM-DD-YYYY';

export const getMonthFormat = () => 'MMMM';

export const getWeekdayFormat = () => 'dddd';

export class HashTable {
  constructor(configurable = true) {
    this.configurable = configurable;
    this.nodes = {};
  }

  put(key, val) {
    if(this.get(key) == null) {
      Object.defineProperty(this.nodes, key, {
        value: val,
        writable: true,
        configurable: this.configurable,
        enumerable: true
      });
    }else {
      throw new Error(`invalid key: ${key}, the entry already exists`);
    }
    return this;
  }

  get(key) {
    return this.nodes[key] || null;
  }

  clearAll() {
    for(const key in this.nodes) {
      if(this.nodes.hasOwnProperty(key)) {
        delete this.nodes[key];
      }
    }
  }
}
