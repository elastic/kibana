/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const mockAnchorHit = {
  _id: '123',
  _index: 'the-index-pattern-id',
  fields: { order_date: ['2021-06-07T18:52:17.000Z'] },
  sort: [1623091937000, 2092],
  isAnchor: true,
  _version: 1,
};

export const mockPredecessorHits = [
  {
    _id: '1',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T19:14:29.000Z'] },
    sort: ['2021-06-07T19:14:29.000Z', 2092],
    _version: 1,
  },
  {
    _id: '2',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T19:14:12.000Z'] },
    sort: ['2021-06-07T19:14:12.000Z', 2431],
    _version: 1,
  },
  {
    _id: '3',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T19:10:22.000Z'] },
    sort: ['2021-06-07T19:10:22.000Z', 2435],
    _version: 1,
  },
];

export const mockSuccessorHits = [
  {
    _id: '11',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T18:49:39.000Z'] },
    sort: ['2021-06-07T18:49:39.000Z', 2382],
    _version: 1,
  },
  {
    _id: '22',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T18:48:28.000Z'] },
    sort: ['2021-06-07T18:48:28.000Z', 2631],
    _version: 1,
  },
  {
    _id: '33',
    _index: 'the-index-pattern-id',
    fields: { order_date: ['2021-06-07T18:47:16.000Z'] },
    sort: ['2021-06-07T18:47:16.000Z', 2437],
    _version: 1,
  },
];
