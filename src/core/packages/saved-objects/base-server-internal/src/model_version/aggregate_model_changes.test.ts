/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsModelChange } from '@kbn/core-saved-objects-server';
import { aggregateMappingAdditions } from './aggregate_model_changes';

describe('aggregateMappingAdditions', () => {
  it('merges top level properties', () => {
    const changes: SavedObjectsModelChange[] = [
      { type: 'mappings_addition', addedMappings: { foo: { type: 'text' } } },
      { type: 'mappings_addition', addedMappings: { bar: { type: 'keyword' } } },
    ];
    const output = aggregateMappingAdditions(changes);
    expect(output).toEqual({
      foo: { type: 'text' },
      bar: { type: 'keyword' },
    });
  });

  it('merges nested properties', () => {
    const changes: SavedObjectsModelChange[] = [
      {
        type: 'mappings_addition',
        addedMappings: { nested: { properties: { foo: { type: 'text' } } } },
      },
      {
        type: 'mappings_addition',
        addedMappings: { nested: { properties: { bar: { type: 'keyword' } } } },
      },
    ];
    const output = aggregateMappingAdditions(changes);
    expect(output).toEqual({
      nested: {
        properties: {
          foo: { type: 'text' },
          bar: { type: 'keyword' },
        },
      },
    });
  });

  it('accepts other types of changes', () => {
    const changes: SavedObjectsModelChange[] = [
      { type: 'mappings_addition', addedMappings: { foo: { type: 'text' } } },
      { type: 'mappings_deprecation', deprecatedMappings: [] },
      { type: 'data_backfill', backfillFn: jest.fn() },
      { type: 'unsafe_transform', transformFn: jest.fn() },
      { type: 'data_removal', removedAttributePaths: [] },
    ];
    const output = aggregateMappingAdditions(changes);
    expect(output).toEqual({
      foo: { type: 'text' },
    });
  });

  it('override in order in case of definition conflict', () => {
    const changes: SavedObjectsModelChange[] = [
      { type: 'mappings_addition', addedMappings: { foo: { type: 'text' } } },
      { type: 'mappings_addition', addedMappings: { foo: { type: 'keyword' } } },
    ];
    const output = aggregateMappingAdditions(changes);
    expect(output).toEqual({
      foo: { type: 'keyword' },
    });
  });
});
