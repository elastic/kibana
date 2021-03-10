/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import { encodeHitVersion } from '../../version';
import { getSavedObjectFromSource } from './internal_utils';

describe('#getSavedObjectFromSource', () => {
  const NAMESPACE_AGNOSTIC_TYPE = 'agnostic-type';
  const NON_NAMESPACE_AGNOSTIC_TYPE = 'other-type';

  const registry = typeRegistryMock.create();
  registry.isNamespaceAgnostic.mockImplementation((type) => type === NAMESPACE_AGNOSTIC_TYPE);

  const id = 'obj-id';
  const _seq_no = 1;
  const _primary_term = 1;
  const attributes = { foo: 'bar' };
  const references = [{ type: 'ref-type', id: 'ref-id', name: 'ref-name' }];
  const migrationVersion = { foo: 'migrationVersion' };
  const coreMigrationVersion = 'coreMigrationVersion';
  const originId = 'originId';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const updated_at = 'updatedAt';

  function createRawDoc(
    type: string,
    namespaceAttrs?: { namespace?: string; namespaces?: string[] }
  ) {
    return {
      // other fields exist on the raw document, but they are not relevant to these test cases
      _seq_no,
      _primary_term,
      _source: {
        type,
        [type]: attributes,
        references,
        migrationVersion,
        coreMigrationVersion,
        originId,
        updated_at,
        ...namespaceAttrs,
      },
    };
  }

  it('returns object with expected attributes', () => {
    const type = 'any-type';
    const doc = createRawDoc(type);

    const result = getSavedObjectFromSource(registry, type, id, doc);
    expect(result).toEqual({
      attributes,
      coreMigrationVersion,
      id,
      migrationVersion,
      namespaces: expect.anything(), // see specific test cases below
      originId,
      references,
      type,
      updated_at,
      version: encodeHitVersion(doc),
    });
  });

  it('returns object with empty namespaces array when type is namespace-agnostic', () => {
    const type = NAMESPACE_AGNOSTIC_TYPE;
    const doc = createRawDoc(type);

    const result = getSavedObjectFromSource(registry, type, id, doc);
    expect(result).toEqual(expect.objectContaining({ namespaces: [] }));
  });

  it('returns object with namespaces when type is not namespace-agnostic and namespaces array is defined', () => {
    const type = NON_NAMESPACE_AGNOSTIC_TYPE;
    const namespaces = ['foo-ns', 'bar-ns'];
    const doc = createRawDoc(type, { namespaces });

    const result = getSavedObjectFromSource(registry, type, id, doc);
    expect(result).toEqual(expect.objectContaining({ namespaces }));
  });

  it('derives namespaces from namespace attribute when type is not namespace-agnostic and namespaces array is not defined', () => {
    // Deriving namespaces from the namespace attribute is an implementation detail of SavedObjectsUtils.namespaceIdToString().
    // However, these test cases assertions are written out anyway for clarity.
    const type = NON_NAMESPACE_AGNOSTIC_TYPE;
    const doc1 = createRawDoc(type, { namespace: undefined });
    const doc2 = createRawDoc(type, { namespace: 'foo-ns' });

    const result1 = getSavedObjectFromSource(registry, type, id, doc1);
    const result2 = getSavedObjectFromSource(registry, type, id, doc2);
    expect(result1).toEqual(expect.objectContaining({ namespaces: ['default'] }));
    expect(result2).toEqual(expect.objectContaining({ namespaces: ['foo-ns'] }));
  });
});
