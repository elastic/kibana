/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { postprocessAnnotations } from './utils';

// const a = [
//   {
//     type: 'datatable',
//     columns: [
//       {
//         id: 'col-0-annotations',
//         name: 'filters',
//         meta: { type: 'number' },
//       },
//       {
//         id: 'col-1-1',
//         name: 'order_date per day',
//         meta: { type: 'date' },
//       },
//       {
//         id: 'col-2-2',
//         name: 'Count',
//         meta: { type: 'number' },
//       },
//       {
//         id: 'col-3-3',
//         name: 'First 10 order_date',
//         meta: { type: 'date' },
//       },
//       {
//         id: 'col-4-4',
//         name: 'First 10 category.keyword',
//         meta: { type: 'string' },
//       },
//     ],
//     rows: [
//       {
//         'col-0-annotations': 'ann1',
//         'col-1-1': 1657749600000,
//         'col-2-2': 2,
//         'col-3-3': ['2022-07-14T11:47:02.000Z', '2022-07-14T20:16:48.000Z'],
//         'col-4-4': ["Men's Clothing", "Women's Accessories"],
//       },
//       {
//         'col-0-annotations': 'ann1',
//         'col-1-1': 1657836000000,
//         'col-2-2': 1,
//         'col-3-3': '2022-07-15T00:20:10.000Z',
//         'col-4-4': ["Women's Clothing", "Women's Shoes"],
//       },
//       {
//         'col-0-annotations': 'ann1',
//         'col-1-1': 1657922400000,
//         'col-2-2': 1,
//         'col-3-3': '2022-07-16T15:27:22.000Z',
//         'col-4-4': "Women's Clothing",
//       },
//       {
//         'col-0-annotations': 'ann2',
//         'col-1-1': 1658008800000,
//         'col-2-2': 1,
//         'col-3-3': '2022-07-17T15:02:53.000Z',
//         'col-4-4': "Men's Clothing",
//       },
//       {
//         'col-0-annotations': 'ann2',
//         'col-1-1': 1658095200000,
//         'col-2-2': 1,
//         'col-3-3': '2022-07-18T06:16:12.000Z',
//         'col-4-4': "Men's Clothing",
//       },
//     ],
//   },
// ];

// describe('Annotations postprocessing', () => {

//   test('returns annotations for different dataviews', async () => {});
//   test('returns annotations for different timefields', async () => {});
//   test('styles are applied back to the annotation', async () => {
//     // adapting
//   });
// test('config properties are passed to the annotations', async () => {});
// test('manual annotations are correctly sorted in the annotations', async () => {});
// test('columns consist of fields and columns from configs', async () => {});
//   describe('Skipped count', () => {
//     test('when multiple annotations have count higher than 10', async () => {});
//     test('when no annotations have count higher than 10', async () => {});
//   });
//   describe('extra fields', () => {
//     test('array values for extra fields', async () => {});
//     test('extra fields only are passed for the annotations requesting them', async () => {});
//     test('runs query annotations for different extra fields', async () => {});
//   });
// });
