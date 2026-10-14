/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFlattenedObject } from '@kbn/std';
import { flattenMappings } from './flatten_mappings';

describe('flattenMappings', () => {
  it('flattens nested objects to dot-paths like getFlattenedObject', () => {
    expect(
      flattenMappings({
        dynamic: false,
        properties: {
          description: { type: 'text' },
          hits: { type: 'integer', index: false },
        },
      })
    ).toEqual({
      dynamic: false,
      'properties.description.type': 'text',
      'properties.hits.type': 'integer',
      'properties.hits.index': false,
    });
  });

  it('preserves an empty root object', () => {
    expect(flattenMappings({})).toEqual({});
  });

  it('preserves an empty nested object as an explicit `{}` leaf', () => {
    expect(flattenMappings({ dynamic: false, properties: {} })).toEqual({
      dynamic: false,
      properties: {},
    });
  });

  it('preserves empty object fields at any nesting level', () => {
    expect(
      flattenMappings({
        dynamic: false,
        properties: {
          title: { type: 'text' },
          meta: { dynamic: false, properties: {} },
        },
      })
    ).toEqual({
      dynamic: false,
      'properties.title.type': 'text',
      'properties.meta.dynamic': false,
      'properties.meta.properties': {},
    });
  });

  it('differs from getFlattenedObject only by retaining empty objects', () => {
    const mappings = {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        meta: { dynamic: false, properties: {} },
      },
    };

    // getFlattenedObject drops the empty `properties` entirely.
    expect(getFlattenedObject(mappings)).toEqual({
      dynamic: false,
      'properties.title.type': 'text',
      'properties.meta.dynamic': false,
    });

    // flattenMappings keeps it.
    expect(flattenMappings(mappings)).toMatchObject({
      'properties.meta.properties': {},
    });
  });

  it('does not treat arrays as objects to recurse into', () => {
    expect(flattenMappings({ values: [1, 2, 3] })).toEqual({ values: [1, 2, 3] });
  });
});
