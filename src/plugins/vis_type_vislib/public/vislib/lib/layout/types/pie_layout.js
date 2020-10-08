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
