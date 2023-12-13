/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';

export const mappings: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    /**
     * Every document indexed to a data stream must contain a `@timestamp`
     * field, mapped as a `date` or `date_nanos` field type.
     */
    '@timestamp': {
      type: 'date',
    },

    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
    },

    description: {
      type: 'text',
    },
  },
};
