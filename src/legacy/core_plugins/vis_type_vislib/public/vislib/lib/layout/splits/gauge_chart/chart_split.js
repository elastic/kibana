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

/*
 * Adds div DOM elements to the `.visWrapper__chart` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.chart` elements as row objects.
 */

export function chartSplit(selection) {
  selection.each(function(data) {
    const div = d3.select(this).attr('class', function() {
      if (data.rows) {
        return 'visWrapper__splitCharts--row';
      } else if (data.columns) {
        return 'visWrapper__splitCharts--column';
      } else {
        return 'visWrapper__chart';
      }
    });
    let divClass;

    const charts = div
      .selectAll('charts')
      .append('div')
      .data(function(d) {
        if (d.rows) {
          divClass = 'chart-row';
          return d.rows;
        } else if (d.columns) {
          divClass = 'chart-column';
          return d.columns;
        } else {
          divClass = 'chart';
          return [d];
        }
      })
      .enter()
      .append('div')
      .attr('class', function() {
        return divClass;
      });

    if (!data.series) {
      charts.call(chartSplit);
    }
  });
}
