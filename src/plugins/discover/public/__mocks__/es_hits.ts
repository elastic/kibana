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
    _version: 1,
    _score: null,
    fields: {
      'array_objects.description.keyword': ['programming list', 'cool stuff list'],
      date: ['2015-01-01T12:10:30.000Z'],
      nested_user: [
        {
          last: ['Smith'],
          'last.keyword': ['Smith'],
          first: ['John'],
          'first.keyword': ['John'],
        },
        {
          last: ['White'],
          'last.keyword': ['White'],
          first: ['Alice'],
          'first.keyword': ['Alice'],
        },
      ],
      array_tags: ['elasticsearch', 'wow'],
      number_amount: [50],
      'array_tags.keyword': ['elasticsearch', 'wow'],
      'array_objects.name.keyword': ['prog_list', 'cool_list'],
      bool_enabled: [false],
      version: ['1.2.3'],
      flattened_labels: [
        {
          release: ['v1.2.5', 'v1.3.0'],
          priority: 'urgent',
        },
      ],
      geo_point: [
        {
          coordinates: [-71.34, 41.12],
          type: 'Point',
        },
      ],
      'array_objects.description': ['programming list', 'cool stuff list'],
      range_time_frame: [
        {
          gte: '2015-10-31 12:00:00',
          lte: '2015-11-01 00:00:00',
        },
      ],
      binary_blob: ['U29tZSBiaW5hcnkgYmxvYg=='],
      text_message: ['Hi there! I am a sample string.'],
      keyword_key: ['abcd1'],
      'object_user.first': ['John'],
      'array_objects.name': ['prog_list', 'cool_list'],
      number_price: [10.99],
      'object_user.last': ['Smith'],
      vector: [0.5, 10, 6],
      ip_addr: ['192.168.1.1'],
    },
    sort: [1420114230000],
  },
  {
    _index: 'sample',
    _id: '2',
    _version: 1,
    _score: null,
    fields: {
      'array_objects.description.keyword': ['elastic list'],
      date: ['2015-01-02T00:00:00.000Z'],
      nested_user: [
        {
          last: ['Smith'],
          'last.keyword': ['Smith'],
          first: ['Jane'],
          'first.keyword': ['Jane'],
        },
      ],
      array_tags: ['elasticsearch'],
      number_amount: [10],
      'array_tags.keyword': ['elasticsearch'],
      'array_objects.name.keyword': ['elastic_list'],
      bool_enabled: [true],
      version: ['1.3.3'],
      flattened_labels: [
        {
          release: ['v1.4.5'],
          priority: 'minor',
        },
      ],
      geo_point: [
        {
          coordinates: [-71.34, 41.12],
          type: 'Point',
        },
      ],
      'array_objects.description': ['elastic list'],
      range_time_frame: [
        {
          gte: '2015-10-31 12:00:00',
          lte: '2016-11-01 00:00:00',
        },
      ],
      binary_blob: ['U29tZSBiaW5hcnkgYmxvYg=='],
      text_message: ['*&%$#@'],
      keyword_key: ['abcd2'],
      'object_user.first': ['Jane'],
      'array_objects.name': ['elastic_list'],
      number_price: [105.99],
      'object_user.last': ['Smith'],
      vector: [0.5, 12, 6],
      ip_addr: ['192.168.1.0'],
    },
    sort: [1420156800000],
  },
];
