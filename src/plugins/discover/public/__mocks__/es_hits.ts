/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const esHits = [
  {
    _index: 'i',
    _id: '1',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.123', message: 'test1', bytes: 20 },
  },
  {
    _index: 'i',
    _id: '2',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test2', extension: 'jpg' },
  },
  {
    _index: 'i',
    _id: '3',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.124', name: 'test3', extension: 'gif', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '4',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.125', name: 'test4', extension: 'png', bytes: 50 },
  },
  {
    _index: 'i',
    _id: '5',
    _score: 1,
    _type: '_doc',
    _source: { date: '2020-20-01T12:12:12.128', name: 'test5', extension: 'doc', bytes: 50 },
  },
];
