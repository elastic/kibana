/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export const esHitsWithVariousFieldTypes = [
  {
    _index: 'sample',
    _id: '1',
    _score: 1,
    _source: {
      keyword_key: 'abcd1',
      text_message: 'Hi there! I am a sample string.',
      number_amount: 50,
      number_price: 10.99,
      bool_enabled: false,
      binary_blob: 'U29tZSBiaW5hcnkgYmxvYg==',
      date: '2015-01-01T12:10:30Z',
      object_user: {
        first: 'John',
        last: 'Smith',
      },
      nested_user: [
        {
          first: 'John',
          last: 'Smith',
        },
        {
          first: 'Alice',
          last: 'White',
        },
      ],
      flattened_labels: {
        priority: 'urgent',
        release: ['v1.2.5', 'v1.3.0'],
      },
      range_time_frame: {
        gte: '2015-10-31 12:00:00',
        lte: '2015-11-01',
      },
      ip_addr: '192.168.1.1',
      version: '1.2.3',
      vector: [0.5, 10, 6],
      geo_point: 'POINT (-71.34 41.12)',
      array_tags: ['elasticsearch', 'wow'],
      array_objects: [
        {
          name: 'prog_list',
          description: 'programming list',
        },
        {
          name: 'cool_list',
          description: 'cool stuff list',
        },
      ],
    },
  },
  {
    _index: 'sample',
    _id: '2',
    _score: 1,
    _source: {
      keyword_key: 'abcd2',
      text_message: '*&%$#@',
      number_amount: 10,
      number_price: 105.99,
      bool_enabled: true,
      binary_blob: 'U29tZSBiaW5hcnkgYmxvYg==',
      date: '2015-01-02',
      object_user: {
        first: 'Jane',
        last: 'Smith',
      },
      nested_user: [
        {
          first: 'Jane',
          last: 'Smith',
        },
      ],
      flattened_labels: {
        priority: 'minor',
        release: ['v1.4.5'],
      },
      range_time_frame: {
        gte: '2015-10-31 12:00:00',
        lte: '2016-11-01',
      },
      ip_addr: '192.168.1.0',
      version: '1.3.3',
      vector: [0.5, 12, 6],
      geo_point: {
        lat: 41.12,
        lon: -71.34,
      },
      array_tags: ['elasticsearch'],
      array_objects: [
        {
          name: 'elastic_list',
          description: 'elastic list',
        },
      ],
    },
  },
];
