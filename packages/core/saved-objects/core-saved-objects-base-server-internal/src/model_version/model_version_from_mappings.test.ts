/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndexMapping, IndexMappingMeta } from '../mappings';
import { getModelVersionsFromMappings } from './model_version_from_mappings';

describe('getModelVersionsFromMappings', () => {
  const createIndexMapping = (parts: Partial<IndexMappingMeta> = {}): IndexMapping => ({
    properties: {},
    _meta: {
      ...parts,
    },
  });

  it('retrieves the version map from docVersions', () => {
    const mappings = createIndexMapping({
      docVersions: {
        foo: 3,
        bar: 5,
      },
    });
    const versionMap = getModelVersionsFromMappings({ mappings, source: 'docVersions' });

    expect(versionMap).toEqual({
      foo: 3,
      bar: 5,
    });
  });

  it('retrieves the version map from mappingVersions', () => {
    const mappings = createIndexMapping({
      mappingVersions: {
        foo: 2,
        bar: 7,
      },
    });
    const versionMap = getModelVersionsFromMappings({ mappings, source: 'mappingVersions' });

    expect(versionMap).toEqual({
      foo: 2,
      bar: 7,
    });
  });

  it('returns undefined for docVersions if meta field is not present', () => {
    const mappings = createIndexMapping({
      mappingVersions: {
        foo: 3,
        bar: 5,
      },
    });
    const versionMap = getModelVersionsFromMappings({ mappings, source: 'docVersions' });

    expect(versionMap).toBeUndefined();
  });

  it('returns undefined for mappingVersions if meta field is not present', () => {
    const mappings = createIndexMapping({
      docVersions: {
        foo: 3,
        bar: 5,
      },
    });
    const versionMap = getModelVersionsFromMappings({ mappings, source: 'mappingVersions' });

    expect(versionMap).toBeUndefined();
  });
});
