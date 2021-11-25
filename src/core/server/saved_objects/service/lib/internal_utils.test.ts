/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { typeRegistryMock } from '../../saved_objects_type_registry.mock';
import type { SavedObjectsRawDoc } from '../../serialization';
import { encodeHitVersion } from '../../version';
import {
  getBulkOperationError,
  getCurrentTime,
  getObjectKey,
  getSavedObjectFromSource,
  normalizeNamespace,
  parseObjectKey,
  rawDocExistsInNamespace,
  rawDocExistsInNamespaces,
} from './internal_utils';
import { ALL_NAMESPACES_STRING } from './utils';

describe('#getBulkOperationError', () => {
  const type = 'obj-type';
  const id = 'obj-id';

  it('returns index not found error', () => {
    const rawResponse = {
      status: 404,
      error: { type: 'index_not_found_exception', reason: 'some-reason', index: 'some-index' },
    };

    const result = getBulkOperationError(type, id, rawResponse);
    expect(result).toEqual({
      error: 'Internal Server Error',
      message: 'An internal server error occurred', // TODO: this error payload is not very helpful to consumers, can we change it?
      statusCode: 500,
    });
  });

  it('returns generic not found error', () => {
    const rawResponse = {
      status: 404,
      error: { type: 'anything', reason: 'some-reason', index: 'some-index' },
    };

    const result = getBulkOperationError(type, id, rawResponse);
    expect(result).toEqual({
      error: 'Not Found',
      message: `Saved object [${type}/${id}] not found`,
      statusCode: 404,
    });
  });

  it('returns conflict error', () => {
    const rawResponse = {
      status: 409,
      error: { type: 'anything', reason: 'some-reason', index: 'some-index' },
    };

    const result = getBulkOperationError(type, id, rawResponse);
    expect(result).toEqual({
      error: 'Conflict',
      message: `Saved object [${type}/${id}] conflict`,
      statusCode: 409,
    });
  });

  it('returns an unexpected result error', () => {
    const rawResponse = {
      status: 123, // any status
      error: { type: 'anything', reason: 'some-reason', index: 'some-index' },
    };

    const result = getBulkOperationError(type, id, rawResponse);
    expect(result).toEqual({
      error: 'Internal Server Error',
      message: `Unexpected bulk response [${rawResponse.status}] ${rawResponse.error.type}: ${rawResponse.error.reason}`,
      statusCode: 500,
    });
  });
});

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

describe('#rawDocExistsInNamespace', () => {
  const SINGLE_NAMESPACE_TYPE = 'single-type';
  const MULTI_NAMESPACE_TYPE = 'multi-type';
  const NAMESPACE_AGNOSTIC_TYPE = 'agnostic-type';

  const registry = typeRegistryMock.create();
  registry.isSingleNamespace.mockImplementation((type) => type === SINGLE_NAMESPACE_TYPE);
  registry.isMultiNamespace.mockImplementation((type) => type === MULTI_NAMESPACE_TYPE);
  registry.isNamespaceAgnostic.mockImplementation((type) => type === NAMESPACE_AGNOSTIC_TYPE);

  function createRawDoc(
    type: string,
    namespaceAttrs: { namespace?: string; namespaces?: string[] }
  ) {
    return {
      // other fields exist on the raw document, but they are not relevant to these test cases
      _source: {
        type,
        ...namespaceAttrs,
      },
    } as SavedObjectsRawDoc;
  }

  describe('single-namespace type', () => {
    it('returns true regardless of namespace or namespaces fields', () => {
      // Technically, a single-namespace type does not exist in a space unless it has a namespace prefix in its raw ID and a matching
      // 'namespace' field. However, historically we have not enforced the latter, we have just relied on searching for and deserializing
      // documents with the correct namespace prefix. We may revisit this in the future.
      const doc1 = createRawDoc(SINGLE_NAMESPACE_TYPE, { namespace: 'some-space' }); // the namespace field is ignored
      const doc2 = createRawDoc(SINGLE_NAMESPACE_TYPE, { namespaces: ['some-space'] }); // the namespaces field is ignored
      expect(rawDocExistsInNamespace(registry, doc1, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc1, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc1, 'other-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, 'other-space')).toBe(true);
    });
  });

  describe('multi-namespace type', () => {
    const docInDefaultSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: ['default'] });
    const docInSomeSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: ['some-space'] });
    const docInAllSpaces = createRawDoc(MULTI_NAMESPACE_TYPE, {
      namespaces: [ALL_NAMESPACES_STRING],
    });
    const docInNoSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: [] });

    it('returns true when the document namespaces matches', () => {
      expect(rawDocExistsInNamespace(registry, docInDefaultSpace, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, docInAllSpaces, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, docInSomeSpace, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, docInAllSpaces, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, docInAllSpaces, 'other-space')).toBe(true);
    });

    it('returns false when the document namespace does not match', () => {
      expect(rawDocExistsInNamespace(registry, docInDefaultSpace, 'other-space')).toBe(false);
      expect(rawDocExistsInNamespace(registry, docInSomeSpace, 'other-space')).toBe(false);
      expect(rawDocExistsInNamespace(registry, docInNoSpace, 'other-space')).toBe(false);
    });
  });

  describe('namespace-agnostic type', () => {
    it('returns true regardless of namespace or namespaces fields', () => {
      const doc1 = createRawDoc(NAMESPACE_AGNOSTIC_TYPE, { namespace: 'some-space' }); // the namespace field is ignored
      const doc2 = createRawDoc(NAMESPACE_AGNOSTIC_TYPE, { namespaces: ['some-space'] }); // the namespaces field is ignored
      expect(rawDocExistsInNamespace(registry, doc1, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc1, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc1, 'other-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, undefined)).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, 'some-space')).toBe(true);
      expect(rawDocExistsInNamespace(registry, doc2, 'other-space')).toBe(true);
    });
  });
});

describe('#rawDocExistsInNamespaces', () => {
  const SINGLE_NAMESPACE_TYPE = 'single-type';
  const MULTI_NAMESPACE_TYPE = 'multi-type';
  const NAMESPACE_AGNOSTIC_TYPE = 'agnostic-type';

  const registry = typeRegistryMock.create();
  registry.isSingleNamespace.mockImplementation((type) => type === SINGLE_NAMESPACE_TYPE);
  registry.isMultiNamespace.mockImplementation((type) => type === MULTI_NAMESPACE_TYPE);
  registry.isNamespaceAgnostic.mockImplementation((type) => type === NAMESPACE_AGNOSTIC_TYPE);

  function createRawDoc(
    type: string,
    namespaceAttrs: { namespace?: string; namespaces?: string[] }
  ) {
    return {
      // other fields exist on the raw document, but they are not relevant to these test cases
      _source: {
        type,
        ...namespaceAttrs,
      },
    } as SavedObjectsRawDoc;
  }

  describe('single-namespace type', () => {
    it('returns true regardless of namespace or namespaces fields', () => {
      // Technically, a single-namespace type does not exist in a space unless it has a namespace prefix in its raw ID and a matching
      // 'namespace' field. However, historically we have not enforced the latter, we have just relied on searching for and deserializing
      // documents with the correct namespace prefix. We may revisit this in the future.
      const doc1 = createRawDoc(SINGLE_NAMESPACE_TYPE, { namespace: 'some-space' }); // the namespace field is ignored
      const doc2 = createRawDoc(SINGLE_NAMESPACE_TYPE, { namespaces: ['some-space'] }); // the namespaces field is ignored
      expect(rawDocExistsInNamespaces(registry, doc1, [])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc1, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc1, ['other-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, [])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, ['other-space'])).toBe(true);
    });
  });

  describe('multi-namespace type', () => {
    const docInDefaultSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: ['default'] });
    const docInSomeSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: ['some-space'] });
    const docInAllSpaces = createRawDoc(MULTI_NAMESPACE_TYPE, {
      namespaces: [ALL_NAMESPACES_STRING],
    });
    const docInNoSpace = createRawDoc(MULTI_NAMESPACE_TYPE, { namespaces: [] });

    it('returns true when the document namespaces matches', () => {
      expect(rawDocExistsInNamespaces(registry, docInDefaultSpace, ['default'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInAllSpaces, ['default'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInSomeSpace, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInAllSpaces, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInDefaultSpace, ['*'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInSomeSpace, ['*'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, docInAllSpaces, ['*'])).toBe(true);
    });

    it('returns false when the document namespace does not match', () => {
      expect(rawDocExistsInNamespaces(registry, docInSomeSpace, ['default'])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInNoSpace, ['default'])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInDefaultSpace, ['some-space'])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInNoSpace, ['some-space'])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInNoSpace, ['*'])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInDefaultSpace, [])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInSomeSpace, [])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInAllSpaces, [])).toBe(false);
      expect(rawDocExistsInNamespaces(registry, docInNoSpace, [])).toBe(false);
    });
  });

  describe('namespace-agnostic type', () => {
    it('returns true regardless of namespace or namespaces fields', () => {
      const doc1 = createRawDoc(NAMESPACE_AGNOSTIC_TYPE, { namespace: 'some-space' }); // the namespace field is ignored
      const doc2 = createRawDoc(NAMESPACE_AGNOSTIC_TYPE, { namespaces: ['some-space'] }); // the namespaces field is ignored
      expect(rawDocExistsInNamespaces(registry, doc1, [])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc1, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc1, ['other-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, [])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, ['some-space'])).toBe(true);
      expect(rawDocExistsInNamespaces(registry, doc2, ['other-space'])).toBe(true);
    });
  });
});

describe('#normalizeNamespace', () => {
  it('throws an error for * (All namespaces string)', () => {
    expect(() => normalizeNamespace(ALL_NAMESPACES_STRING)).toThrowErrorMatchingInlineSnapshot(
      `"\\"options.namespace\\" cannot be \\"*\\": Bad Request"`
    );
  });

  it('returns undefined for undefined or "default" namespace inputs', () => {
    [undefined, 'default'].forEach((namespace) => {
      expect(normalizeNamespace(namespace)).toBeUndefined();
    });
  });

  it('returns namespace string for other namespace string inputs', () => {
    ['foo', 'bar'].forEach((namespace) => {
      expect(normalizeNamespace(namespace)).toBe(namespace);
    });
  });
});

describe('#getCurrentTime', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeAll(() => (dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1631307600000)));
  afterAll(() => dateNowSpy.mockRestore());

  it('returns the current time', () => {
    expect(getCurrentTime()).toEqual('2021-09-10T21:00:00.000Z');
  });
});

describe('#getObjectKey', () => {
  it('returns the expected key string', () => {
    expect(getObjectKey({ type: 'foo', id: 'bar' })).toEqual('foo:bar');
  });
});

describe('#parseObjectKey', () => {
  it('returns the expected object', () => {
    expect(parseObjectKey('foo:bar')).toEqual({ type: 'foo', id: 'bar' });
  });

  it('throws error when input is malformed', () => {
    expect(() => parseObjectKey('foobar')).toThrowError('Malformed object key');
  });
});
