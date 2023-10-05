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
    _version: 2,
    _score: null,
    fields: {
      date: ['2022-05-22T12:10:30.000Z'],
      'array_objects.description.keyword': ['programming list', 'cool stuff list'],
      rank_features: [
        {
          '2star': 100,
          '1star': 10,
        },
      ],
      array_tags: ['elasticsearch', 'wow'],
      'array_objects.name.keyword': ['prog_list', 'cool_list'],
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
      binary_blob: ['U29tZSBiaW5hcnkgYmxvYg=='],
      text_message: ['Hi there! I am a sample string.'],
      'object_user.first': ['John'],
      keyword_key: ['abcd1'],
      'array_objects.name': ['prog_list', 'cool_list'],
      vector: [0.5, 10, 6],
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
      number_amount: [50],
      'array_tags.keyword': ['elasticsearch', 'wow'],
      bool_enabled: [false],
      version: ['1.2.3'],
      histogram: [
        {
          counts: [3, 7, 23, 12, 6],
          values: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      ],
      'array_objects.description': ['programming list', 'cool stuff list'],
      range_time_frame: [
        {
          gte: '2015-10-31 12:00:00',
          lte: '2015-11-01 00:00:00',
        },
      ],
      number_price: [10.99],
      'object_user.last': ['Smith'],
      geometry: [
        {
          coordinates: [
            [
              [1000, -1001],
              [1001, -1001],
              [1001, -1000],
              [1000, -1000],
              [1000, -1001],
            ],
          ],
          type: 'Polygon',
        },
      ],
      date_nanos: ['2022-01-01T12:10:30.123456789Z'],
      ip_addr: ['192.168.1.1'],
      runtime_number: [5.5],
      scripted_string: ['hi there'],
    },
    sort: [1653221430000],
  },
  {
    _index: 'sample',
    _id: '2',
    _version: 8,
    _score: null,
    fields: {
      date: ['2022-05-20T00:00:00.000Z'],
      'array_objects.description.keyword': ['elastic list'],
      rank_features: [
        {
          '2star': 350,
          '1star': 20,
        },
      ],
      array_tags: ['=1+2\'" ;,=1+2'],
      'array_objects.name.keyword': ['elastic_list'],
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
      binary_blob: ['U29tZSBiaW5hcnkgYmxvYg=='],
      text_message: ["I'm multiline\n*&%$#@"],
      'object_user.first': ['Jane'],
      keyword_key: ['=1+2";=1+2'],
      'array_objects.name': ['elastic_list'],
      vector: [0.5, 12, 6],
      nested_user: [
        {
          last: ['Smith'],
          'last.keyword': ['Smith'],
          first: ['Jane'],
          'first.keyword': ['Jane'],
        },
      ],
      number_amount: [10],
      'array_tags.keyword': ['=1+2\'" ;,=1+2'],
      bool_enabled: [true],
      version: ['1.3.3'],
      histogram: [
        {
          counts: [8, 17, 8, 7, 6, 2],
          values: [0.1, 0.25, 0.35, 0.4, 0.45, 0.5],
        },
      ],
      'array_objects.description': ['elastic list'],
      range_time_frame: [
        {
          gte: '2015-10-31 12:00:00',
          lte: '2016-11-01 00:00:00',
        },
      ],
      number_price: [105.99],
      'object_user.last': ['Smith'],
      geometry: [
        {
          geometries: [
            {
              coordinates: [1000, 100],
              type: 'Point',
            },
            {
              coordinates: [
                [1001, 100],
                [1002, 100],
              ],
              type: 'LineString',
            },
          ],
          type: 'GeometryCollection',
        },
      ],
      date_nanos: ['2022-01-02T11:10:30.123456789Z'],
      ip_addr: ['192.168.1.0'],
      runtime_number: [5.5],
      scripted_string: ['=1+2";=1+2'],
    },
    sort: [1653004800000],
  },
];
