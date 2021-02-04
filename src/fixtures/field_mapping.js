/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default {
  test: {
    mappings: {
      testType: {
        baz: {
          full_name: 'baz',
          mapping: {
            bar: {
              type: 'long',
            },
          },
        },
        'foo.bar': {
          full_name: 'foo.bar',
          mapping: {
            bar: {
              type: 'string',
            },
          },
        },
        not_analyzed_field: {
          full_name: 'not_analyzed_field',
          mapping: {
            bar: {
              type: 'string',
              index: 'not_analyzed',
            },
          },
        },
        index_no_field: {
          full_name: 'index_no_field',
          mapping: {
            bar: {
              type: 'string',
              index: 'no',
            },
          },
        },
        _id: {
          full_name: '_id',
          mapping: {
            _id: {
              store: false,
              index: 'no',
            },
          },
        },
        _timestamp: {
          full_name: '_timestamp',
          mapping: {
            _timestamp: {
              store: true,
              index: 'no',
            },
          },
        },
      },
    },
  },
};
