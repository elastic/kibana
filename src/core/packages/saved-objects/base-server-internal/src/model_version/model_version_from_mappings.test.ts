/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping, IndexMappingMeta } from '../mappings';
import { getVirtualVersionsFromMappings } from './model_version_from_mappings';

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
        foo: '10.3.0',
        bar: '8.16.2',
      },
    });
    const versionMap = getVirtualVersionsFromMappings({ mappings, source: 'docVersions' });

    expect(versionMap).toEqual({
      foo: '10.3.0',
      bar: '8.16.2',
    });
  });

  it('retrieves the version map from mappingVersions', () => {
    const mappings = createIndexMapping({
      mappingVersions: {
        foo: '10.2.0',
        bar: '7.17.0',
      },
    });
    const versionMap = getVirtualVersionsFromMappings({ mappings, source: 'mappingVersions' });

    expect(versionMap).toEqual({
      foo: '10.2.0',
      bar: '7.17.0',
    });
  });

  it('returns undefined for docVersions if meta field is not present', () => {
    const mappings = createIndexMapping({
      mappingVersions: {
        foo: '10.3.0',
        bar: '10.5.0',
      },
    });
    const versionMap = getVirtualVersionsFromMappings({ mappings, source: 'docVersions' });

    expect(versionMap).toBeUndefined();
  });

  it('returns undefined for mappingVersions if meta field is not present', () => {
    const mappings = createIndexMapping({
      docVersions: {
        foo: '10.3.0',
        bar: '10.5.0',
      },
    });
    const versionMap = getVirtualVersionsFromMappings({ mappings, source: 'mappingVersions' });

    expect(versionMap).toBeUndefined();
  });
});
