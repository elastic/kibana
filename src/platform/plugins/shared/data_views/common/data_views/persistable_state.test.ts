/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewPersistableStateService } from './persistable_state';
import type { SavedObjectReference } from '@kbn/core/server';
import { DataViewSpec } from '../types';
const { inject, extract } = DataViewPersistableStateService;

describe('data view persistable state tests', () => {
  test('inject references', () => {
    const state: DataViewSpec = {
      id: 'my-id',
      title: 'my-title',
      fields: {},
    };
    const references: SavedObjectReference[] = [];

    const result = inject(state, references);

    expect(result).toBe(state);
  });

  test('extract references', () => {
    const state: DataViewSpec = {
      id: 'my-id',
      title: 'my-title',
      fields: {},
    };

    const result = extract(state);

    expect(result.state).toBe(state);
    expect(result.references).toEqual([]);
  });
});
