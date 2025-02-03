/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import d3 from 'd3';

/*
 * Adds div DOM elements to the `.visWrapper__chart` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.chart` elements as row objects.
 */

export function chartSplit(selection) {
  selection.each(function (data) {
    const div = d3.select(this).attr('class', function () {
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
      .data(function (d) {
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
      .attr('class', function () {
        return divClass;
      });

    if (!data.series) {
      charts.call(chartSplit);
    }
  });
}
