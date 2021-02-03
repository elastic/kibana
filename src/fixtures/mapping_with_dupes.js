/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      },
    },
  },
  duplicates: {
    mappings: {
      testType: {
        baz: {
          full_name: 'baz',
          mapping: {
            bar: {
              type: 'date',
            },
          },
        },
      },
    },
  },
};
