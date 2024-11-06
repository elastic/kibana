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
 * Adds div DOM elements to either the `.visAxis__splitTitles--y` element or the
 * `.visAxis__splitTitles--x` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.chart-title` elements as row objects.
 * if not data.rows or data.columns, return no chart titles
 */

export function chartTitleSplit(selection, parent) {
  selection.each(function (data) {
    const div = d3.select(this);

    if (!data.slices) {
      div
        .selectAll('.chart-title')
        .append('div')
        .data(function (d) {
          return d.rows ? d.rows : d.columns;
        })
        .enter()
        .append('div')
        .attr('class', 'chart-title');

      if (data.rows) {
        d3.select(parent).select('.visAxis__splitTitles--x').remove();
      } else {
        d3.select(parent).select('.visAxis__splitTitles--y').remove();
      }

      return div;
    }

    return d3.select(this).remove();
  });
}
