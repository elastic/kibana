/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { chartSplit } from '../splits/column_chart/chart_split';
import { yAxisSplit } from '../splits/column_chart/y_axis_split';
import { xAxisSplit } from '../splits/column_chart/x_axis_split';
import { chartTitleSplit } from '../splits/column_chart/chart_title_split';

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

export function columnLayout(el, data) {
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
          class: 'visAxis--y',
          children: [
            {
              type: 'div',
              class: 'visAxis__spacer--y visAxis__spacer--y-top',
            },
            {
              type: 'div',
              class: 'visAxis__column--y visAxis__column--left',
              children: [
                {
                  type: 'div',
                  class: 'visAxis__splitTitles--y',
                  splits: chartTitleSplit,
                },
                {
                  type: 'div',
                  class: 'visAxis__splitAxes--y',
                  splits: yAxisSplit,
                },
              ],
            },
            {
              type: 'div',
              class: 'visAxis__spacer--y visAxis__spacer--y-bottom',
            },
          ],
        },
        {
          type: 'div',
          class: 'visWrapper__column',
          children: [
            {
              type: 'div',
              class: 'visAxis--x visAxis__column--top',
              children: [
                {
                  type: 'div',
                  class: 'visAxis__splitAxes--x',
                  splits: xAxisSplit,
                },
              ],
            },
            {
              type: 'div',
              class: 'visWrapper__chart',
              splits: chartSplit,
            },
            {
              type: 'div',
              class: 'visWrapper__alerts',
            },
            {
              type: 'div',
              class: 'visAxis--x visAxis__column--bottom',
              children: [
                {
                  type: 'div',
                  class: 'visAxis__splitAxes--x',
                  splits: xAxisSplit,
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
        {
          type: 'div',
          class: 'visAxis--y',
          children: [
            {
              type: 'div',
              class: 'visAxis__spacer--y visAxis__spacer--y-top',
            },
            {
              type: 'div',
              class: 'visAxis__column--y visAxis__column--right',
              children: [
                {
                  type: 'div',
                  class: 'visAxis__splitAxes--y',
                  splits: yAxisSplit,
                },
              ],
            },
            {
              type: 'div',
              class: 'visAxis__spacer--y visAxis__spacer--y-bottom',
            },
          ],
        },
      ],
    },
  ];
}
