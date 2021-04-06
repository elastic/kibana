/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chartSplit } from '../splits/pie_chart/chart_split';
import { chartTitleSplit } from '../splits/pie_chart/chart_title_split';

/**
 * Specifies the visualization layout for column charts.
 *
 * This is done using an array of objects. The first object has
 * a `parent` DOM element,  a DOM `type` (e.g. div, svg, etc),
 * and a `class` (required). Each child can omit the parent object,
 * but must include a type and class.
 *
 * Optionally, you can specify `datum` to be bound to the DOM
 * element, a `splits` function that divides the selected element
 * into more DOM elements based on a callback function provided, or
 * a children array which nests other layout objects.
 *
 * Objects in children arrays are children of the current object and return
 * DOM elements which are children of their respective parent element.
 */

export function pieLayout(el, data) {
  if (!el || !data) {
    throw new Error('Both an el and data need to be specified');
  }

  return [
    {
      parent: el,
      type: 'div',
      class: 'visWrapper',
      datum: data,
      children: [
        {
          type: 'div',
          class: 'visAxis__splitTitles--y',
          splits: chartTitleSplit,
        },
        {
          type: 'div',
          class: 'visWrapper__column',
          children: [
            {
              type: 'div',
              class: 'visWrapper__chart',
              splits: chartSplit,
            },
            {
              type: 'div',
              class: 'visAxis__splitTitles--x',
              splits: chartTitleSplit,
            },
          ],
        },
      ],
    },
  ];
}
