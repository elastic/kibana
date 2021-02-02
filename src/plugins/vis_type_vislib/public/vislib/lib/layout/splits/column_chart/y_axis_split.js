/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';

/*
 * Adds div DOM elements to the `.visAxis__splitAxes--y` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.y-axis-div` elements as row objects.
 */

// render and get bounding box width
export function yAxisSplit(selection) {
  selection.each(function () {
    const div = d3.select(this);
    let rows;

    div
      .selectAll('.y-axis-div')
      .append('div')
      .data(function (d) {
        rows = d.rows ? d.rows.length : 1;
        return d.rows ? d.rows : [d];
      })
      .enter()
      .append('div')
      .attr('class', (d, i) => {
        let divClass = '';
        if (i === 0) {
          divClass += ' visWrapper__chart--first';
        }
        if (i === rows - 1) {
          divClass += ' visWrapper__chart--last';
        }
        return 'y-axis-div axis-div' + divClass;
      });
  });
}
