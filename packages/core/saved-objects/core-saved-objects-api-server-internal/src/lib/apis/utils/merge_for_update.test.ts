/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTypeMappingDefinition } from '@kbn/core-saved-objects-server';
import { mergeForUpdate } from './merge_for_update';

const defaultMappings: SavedObjectsTypeMappingDefinition = {
  properties: {},
};

describe('mergeForUpdate', () => {
  it('merges top level properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { foo: 'bar', hello: 'dolly' },
        updatedAttributes: { baz: 42 },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      foo: 'bar',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('overrides top level properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { foo: 'bar', hello: 'dolly' },
        updatedAttributes: { baz: 42, foo: '9000' },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      foo: '9000',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('ignores undefined top level properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { foo: 'bar', hello: 'dolly' },
        updatedAttributes: { baz: 42, foo: undefined },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      foo: 'bar',
      hello: 'dolly',
      baz: 42,
    });
  });

  it('merges nested properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { nested: { foo: 'bar', hello: 'dolly' } },
        updatedAttributes: { nested: { baz: 42 } },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      nested: {
        foo: 'bar',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('overrides nested properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { nested: { foo: 'bar', hello: 'dolly' } },
        updatedAttributes: { nested: { baz: 42, foo: '9000' } },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      nested: {
        foo: '9000',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('ignores undefined nested properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: { nested: { foo: 'bar', hello: 'dolly' } },
        updatedAttributes: { nested: { baz: 42, foo: undefined } },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      nested: {
        foo: 'bar',
        hello: 'dolly',
        baz: 42,
      },
    });
  });

  it('functions with mixed levels of properties', () => {
    expect(
      mergeForUpdate({
        targetAttributes: {
          rootPropA: 'A',
          nested: { foo: 'bar', hello: 'dolly', deep: { deeper: 'we need' } },
        },
        updatedAttributes: {
          rootPropB: 'B',
          nested: { baz: 42, foo: '9000', deep: { deeper: 'we are' } },
        },
        typeMappings: defaultMappings,
      })
    ).toEqual({
      rootPropA: 'A',
      rootPropB: 'B',
      nested: {
        foo: '9000',
        hello: 'dolly',
        baz: 42,
        deep: {
          deeper: 'we are',
        },
      },
    });
  });

  describe('with flattened fields', () => {
    const mappingsWithFlattened: SavedObjectsTypeMappingDefinition = {
      properties: {
        flattened: {
          type: 'flattened',
        },
        nested: {
          properties: {
            deepFlat: {
              type: 'flattened',
            },
          },
        },
      },
    };

    it('replaces top level flattened properties', () => {
      expect(
        mergeForUpdate({
          targetAttributes: { flattened: { before: 42 }, notFlattened: { before: 42 } },
          updatedAttributes: { flattened: { after: 9000 }, notFlattened: { after: 9000 } },
          typeMappings: mappingsWithFlattened,
        })
      ).toEqual({ flattened: { after: 9000 }, notFlattened: { before: 42, after: 9000 } });
    });

    it('replaces nested flattened properties', () => {
      expect(
        mergeForUpdate({
          targetAttributes: { nested: { deepFlat: { before: 42 }, notFlattened: { before: 42 } } },
          updatedAttributes: {
            nested: { deepFlat: { after: 9000 }, notFlattened: { after: 9000 } },
          },
          typeMappings: mappingsWithFlattened,
        })
      ).toEqual({
        nested: { deepFlat: { after: 9000 }, notFlattened: { before: 42, after: 9000 } },
      });
    });
  });
});
