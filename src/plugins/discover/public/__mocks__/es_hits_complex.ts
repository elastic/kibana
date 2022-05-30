/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const esHitsComplex = [
  {
    _index: 'sample',
    _id: '1',
    _version: 1,
    _score: null,
    fields: {
      'array_objects.description.keyword': ['programming list', 'cool stuff list'],
      date: ['2022-05-30T12:10:30.000Z'],
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
      'array_objects.name.keyword': ['prog_list', 'cool_list'],
      'array_tags.keyword': ['elasticsearch', 'wow'],
      bool_enabled: [false],
      version: ['1.2.3'],
      flattened_labels: [
        {
          release: ['v1.2.5', 'v1.3.0'],
          priority: 'urgent',
        },
      ],
      runtime_number: [5.5],
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
      scripted_string: ['hi there'],
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
      date: ['2022-05-31T00:00:00.000Z'],
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
      'array_objects.name.keyword': ['elastic_list'],
      'array_tags.keyword': ['elasticsearch'],
      bool_enabled: [true],
      version: ['1.3.3'],
      flattened_labels: [
        {
          release: ['v1.4.5'],
          priority: 'minor',
        },
      ],
      runtime_number: [5.5],
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
      text_message: ["I'm multiline\n*&%$#@"],
      keyword_key: ['abcd2'],
      'object_user.first': ['Jane'],
      'array_objects.name': ['elastic_list'],
      number_price: [105.99],
      'object_user.last': ['Smith'],
      vector: [0.5, 12, 6],
      ip_addr: ['192.168.1.0'],
      scripted_string: ['hi there'],
    },
    sort: [1420156800000],
  },
  {
    _index: 'sample',
    _id: '3',
    _version: 1,
    _score: null,
    fields: {
      'array_objects.description.keyword': ['elastic list'],
      date: ['2022-05-31T00:00:00.000Z'],
      nested_user: [
        {
          last: ['Smith'],
          'last.keyword': ['Smith'],
          first: ['Jane'],
          'first.keyword': ['Jane'],
        },
      ],
      array_tags: ['=1+2";=1+2'],
      number_amount: [10],
      'array_objects.name.keyword': ['elastic_list'],
      'array_tags.keyword': ['=1+2";=1+2'],
      bool_enabled: [true],
      version: ['1.3.3'],
      flattened_labels: [
        {
          release: ['v1.4.5'],
          priority: 'minor',
        },
      ],
      runtime_number: [5.5],
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
      text_message: ["I'm multiline\n*&%$#@"],
      keyword_key: ['abcd2'],
      'object_user.first': ['Jane'],
      'array_objects.name': ['elastic_list'],
      number_price: [105.99],
      'object_user.last': ['Smith'],
      vector: [0.5, 12, 6],
      ip_addr: ['192.168.1.0'],
      scripted_string: ['=1+2\'" ;,=1+2'],
    },
    sort: [1420156800000],
  },
];
