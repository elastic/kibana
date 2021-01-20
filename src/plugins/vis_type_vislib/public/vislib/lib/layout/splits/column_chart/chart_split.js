/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';

/*
 * Adds div DOM elements to the `.visWrapper__chart` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.chart` elements as row objects.
 */
export function chartSplit(selection, parent) {
  selection.each(function (data) {
    const div = d3.select(this).attr('class', function () {
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
      .data(function (d) {
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
      .attr('class', function (d, i) {
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
