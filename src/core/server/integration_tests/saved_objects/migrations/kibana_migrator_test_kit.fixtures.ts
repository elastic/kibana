/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsBulkCreateObject } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

const defaultType: SavedObjectsType<any> = {
  name: 'defaultType',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      name: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
    },
  },
  switchToModelVersionAt: '8.10.0',
  migrations: {},
};

export const baselineTypes: Array<SavedObjectsType<any>> = [
  {
    ...defaultType,
    name: 'server',
  },
  {
    ...defaultType,
    name: 'basic',
  },
  {
    ...defaultType,
    name: 'deprecated',
  },
  {
    ...defaultType,
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
