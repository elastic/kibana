/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const typedef: Partial<SavedObjectsType> = {
  mappings: {
    properties: {
      foo: {
        type: 'keyword',
      },
      count: {
        type: 'integer',
      },
    },
  },
  switchToModelVersionAt: '8.8.0',
  schemas: {
    '8.7.0': schema.object({
      foo: schema.string(),
    }),
    '8.8.0': schema.object({
      foo: schema.string(),
      count: schema.number(),
    }),
  },
};

export const typedef1: Partial<SavedObjectsType> = {
  mappings: {
    properties: {
      foo: {
        type: 'keyword',
      },
      count: {
        type: 'integer',
      },
    },
  },
  switchToModelVersionAt: '8.8.0',
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            count: {
              properties: {
                count: {
                  type: 'integer',
                },
              },
            },
          },
        },
      ],
      schemas: {
        create: schema.object({
          foo: schema.string(),
          count: schema.number(),
        }),
      },
    },
  },
  schemas: {
    '8.7.0': schema.object({
      foo: schema.string(),
    }),
    '8.8.0': schema.object({
      foo: schema.string(),
      count: schema.number(),
    }),
  },
};

export const typedef2: Partial<SavedObjectsType> = {
  mappings: {
    properties: {
      foo: {
        type: 'keyword',
      },
      count: {
        type: 'integer',
      },
    },
  },
  switchToModelVersionAt: '8.8.0',
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            count: {
              properties: {
                count: {
                  type: 'integer',
                },
              },
            },
          },
        },
      ],
      schemas: {
        create: schema.object({
          foo: schema.string(),
          count: schema.number(),
        }),
      },
    },
  },
  schemas: {
    '8.7.0': schema.object({
      foo: schema.string(),
    }),
  },
};
