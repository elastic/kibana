/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const baselineTypes: Array<Partial<SavedObjectsType>> = [
  {
    name: 'server',
  },
  {
    name: 'basic',
  },
  {
    name: 'deprecated',
  },
  {
    name: 'complex',
    mappings: {
      properties: {
        name: { type: 'text' },
        value: { type: 'integer' },
      },
    },
    excludeOnUpgrade: () => {
      return {
        bool: {
          must: [{ term: { type: 'complex' } }, { range: { 'complex.value': { lte: 1 } } }],
        },
      };
    },
  },
];

export const baselineDocuments: SavedObjectsBulkCreateObject[] = [
  ...['server-foo', 'server-bar', 'server-baz'].map((name) => ({
    type: 'server',
    attributes: {
      name,
    },
  })),
  ...['basic-foo', 'basic-bar', 'basic-baz'].map((name) => ({
    type: 'basic',
    attributes: {
      name,
    },
  })),
  ...['deprecated-foo', 'deprecated-bar', 'deprecated-baz'].map((name) => ({
    type: 'deprecated',
    attributes: {
      name,
    },
  })),
  ...['complex-foo', 'complex-bar', 'complex-baz', 'complex-lipsum'].map((name, index) => ({
    type: 'complex',
    attributes: {
      name,
      value: index,
    },
  })),
];
