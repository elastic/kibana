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
export function chartSplit(selection, parent) {
  selection.each(function(data) {
    const div = d3.select(this).attr('class', function() {
      if (data.rows) {
        return 'visWrapper__splitCharts--row';
      } else if (data.columns) {
        return 'visWrapper__splitCharts--column';
      } else {
        if (parent) {
          return 'visWrapper__chart--first visWrapper__chart--last visWrapper__chart';
        }
        return this.className + ' visWrapper__chart';
      }
    });
    let divClass = '';
    let chartsNumber;

    const charts = div
      .selectAll('charts')
      .append('div')
      .data(function(d) {
        if (d.rows) {
          chartsNumber = d.rows.length;
          return d.rows;
        } else if (d.columns) {
          chartsNumber = d.columns.length;
          return d.columns;
        } else {
          divClass = 'chart';
          chartsNumber = 1;
          return [d];
        }
      })
      .enter()
      .append('div')
      .attr('class', function(d, i) {
        let fullDivClass = divClass;
        if (fullDivClass !== 'chart') {
          if (chartsNumber > 1) {
            if (i === 0) {
              fullDivClass += ' visWrapper__chart--first';
            } else if (i === chartsNumber - 1) {
              fullDivClass += ' visWrapper__chart--last';
            }
          } else {
            fullDivClass += ' visWrapper__chart--first visWrapper__chart--last';
          }
        }
        return fullDivClass;
      });

    if (!data.series) {
      charts.call(chartSplit);
    }
  });
}
