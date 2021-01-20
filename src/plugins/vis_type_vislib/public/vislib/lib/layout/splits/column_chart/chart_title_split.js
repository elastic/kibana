/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import d3 from 'd3';
import $ from 'jquery';

/*
 * Adds div DOM elements to either the `.visAxis__splitTitles--y` element or the
 * `.visAxis__splitTitles--x` element based on the data layout.
 * For example, if the data has rows, it returns the same number of
 * `.chart-title` elements as row objects.
 * if not data.rows or data.columns, return no chart titles
 */
export function chartTitleSplit(selection) {
  selection.each(function (data) {
    const div = d3.select(this);
    const parent = $(this).parents('.visWrapper');

    if (!data.series) {
      div
        .selectAll('.chart-title')
        .data(function (d) {
          return d.rows ? d.rows : d.columns;
        })
        .enter()
        .append('div')
        .attr('class', 'chart-title');

      if (data.rows) {
        parent.find('.visAxis__splitTitles--x').remove();
      } else {
        parent.find('.visAxis__splitTitles--y').remove();
      }

      return div;
    }

    return d3.select(this).remove();
  });
}
