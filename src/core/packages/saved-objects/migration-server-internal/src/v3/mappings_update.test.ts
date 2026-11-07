/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { getMappingsUpdate } from './mappings_update';
import { createTestContext, createTestTypes, indexMappingsWith } from './test_helpers/context';

describe('getMappingsUpdate', () => {
  const context = createTestContext();
  const fooBeforeV2 = indexMappingsWith(context, {
    mappingVersions: { foo: '10.1.0', bar: '10.1.0' },
  });

  it('picks up the documents of the types whose mappings changed, except the outdated ones', () => {
    const { pickupQuery } = getMappingsUpdate(context, fooBeforeV2);
    expect(pickupQuery).toEqual({
      bool: {
        must: [{ bool: { should: [{ term: { type: 'foo' } }] } }],
        must_not: [context.outdatedDocumentsQuery],
      },
    });
  });

  it('picks up all documents when a root field changed', () => {
    const { managed, ...properties } = fooBeforeV2.properties;
    const { pickupQuery } = getMappingsUpdate(context, { ...fooBeforeV2, properties });
    expect(pickupQuery).toEqual({
      bool: { must: [{ match_all: {} }], must_not: [context.outdatedDocumentsQuery] },
    });
  });

  it('does not exclude outdated documents when no document can be outdated', () => {
    const withoutVersions: SavedObjectsType[] = createTestTypes().map(
      ({ modelVersions, ...type }) => type
    );
    const unversioned = createTestContext({ types: withoutVersions });
    const { managed, ...properties } = unversioned.indexMappings.properties;
    const { pickupQuery } = getMappingsUpdate(unversioned, {
      ...unversioned.indexMappings,
      properties,
    });
    expect(pickupQuery).toEqual({ match_all: {} });
  });

  it('picks up no documents when only the model versions without mapping changes increased', () => {
    const { pickupQuery } = getMappingsUpdate(
      context,
      indexMappingsWith(context, { mappingVersions: { foo: '10.2.0', bar: '10.0.0' } })
    );
    expect(pickupQuery).toBeUndefined();
  });

  it('only contains the mappings of the types that changed, without _meta', () => {
    const { mappings } = getMappingsUpdate(context, fooBeforeV2);
    expect(Object.keys(mappings.properties)).toEqual(['foo']);
    expect(mappings).not.toHaveProperty('_meta');
  });
});
