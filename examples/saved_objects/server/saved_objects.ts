/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core/server';

export interface TypeAAttributes {
  name: string;
  myDateField: string;
}
export const TYPE_A = 'type-a';
export const typeA: SavedObjectsType<TypeAAttributes> = {
  name: TYPE_A,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    properties: {
      name: { type: 'text' },
      myDateField: { type: 'date' },
    },
  },
};

export interface TypeBAttributes {
  name: string;
  myOtherDateField: string;
}
export const TYPE_B = 'type-b';
export const typeB: SavedObjectsType<TypeBAttributes> = {
  name: TYPE_B,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    properties: {
      name: { type: 'text' },
      myOtherDateField: { type: 'date' },
    },
  },
};
