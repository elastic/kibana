/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';

/*
 * Adds div DOM elements to the `.visAxis__splitAxes--x` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.x-axis-div` elements as row objects.
 */

export function xAxisSplit(selection) {
  selection.each(function () {
    const div = d3.select(this);
    let columns;
    div
      .selectAll('.x-axis-div')
      .append('div')
      .data(function (d) {
        columns = d.columns ? d.columns.length : 1;
        return d.columns ? d.columns : [d];
      })
      .enter()
      .append('div')
      .attr('class', (d, i) => {
        let divClass = '';
        if (i === 0) {
          divClass += ' visWrapper__chart--first';
        }
        if (i === columns - 1) {
          divClass += ' visWrapper__chart--last';
        }
        return 'x-axis-div axis-div' + divClass;
      });
  });
}
