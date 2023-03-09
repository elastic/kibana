/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import { generateAdditiveMappingDiff } from './generate_additive_mapping_diff';
import { createType } from '../test_helpers';

describe('generateAdditiveMappingDiff', () => {
  const deletedTypes = ['deletedType'];

  const getTypes = () => {
    const foo = createType({
      name: 'foo',
      modelVersions: {
        1: { modelChange: { type: 'expansion' } },
        2: { modelChange: { type: 'expansion' } },
      },
      mappings: { properties: { fooProp: { type: 'text' } } },
    });
    const bar = createType({
      name: 'bar',
      modelVersions: {
        1: { modelChange: { type: 'expansion' } },
        2: { modelChange: { type: 'expansion' } },
      },
      mappings: { properties: { barProp: { type: 'text' } } },
    });

    return { foo, bar };
  };

  it('aggregates the mappings of the types with versions higher than in the index', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: 1,
        bar: 1,
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      meta,
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
      bar: bar.mappings,
    });
  });

  it('ignores mapping from types already up to date', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: 1,
        bar: 2,
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      meta,
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
    });
  });

  it('ignores deleted types', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: 1,
        bar: 1,
        deletedType: 42,
      },
    };

    const addedMappings = generateAdditiveMappingDiff({
      types,
      meta,
      deletedTypes,
    });

    expect(addedMappings).toEqual({
      foo: foo.mappings,
      bar: bar.mappings,
    });
  });

  it('throws an error in case of version conflict', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {
      mappingVersions: {
        foo: 1,
        bar: 3,
      },
    };

    expect(() =>
      generateAdditiveMappingDiff({
        types,
        meta,
        deletedTypes,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate model version difference: conflict between versions"`
    );
  });

  it('throws an error if mappingVersions is not present on the index meta', () => {
    const { foo, bar } = getTypes();
    const types = [foo, bar];
    const meta: IndexMappingMeta = {};

    expect(() =>
      generateAdditiveMappingDiff({
        types,
        meta,
        deletedTypes,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate additive mapping diff: mappingVersions not present on index meta"`
    );
  });
});
