/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getObjectKeyProvider, ObjectKeyProvider } from './get_object_key';
import { typeRegistryMock } from '../../saved_objects_type_registry.mock';

describe('getObjectKeyProvider', () => {
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;
  const namespace = 'current-ns';

  beforeEach(() => {
    typeRegistry = typeRegistryMock.create();
    typeRegistry.isSingleNamespace.mockImplementation((name) => name === 'single');
    typeRegistry.isNamespaceAgnostic.mockImplementation((name) => name === 'agnostic');
    typeRegistry.isMultiNamespace.mockImplementation((name) => name === 'multi');
  });

  describe('when `useProvidedNamespace=true` and `useObjectNamespaces=true`', () => {
    let getObjKey: ObjectKeyProvider;

    beforeEach(() => {
      getObjKey = getObjectKeyProvider({
        typeRegistry,
        namespace,
        useProvidedNamespace: true,
        useObjectNamespaces: true,
      });
    });

    it('returns the correct ID for a single-namespaced type with namespace specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
          namespaces: ['object-ns'],
        })
      ).toEqual('object-ns:single:42');
    });

    it('returns the correct ID for a single-namespaced type with namespace not specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
        })
      ).toEqual('current-ns:single:42');
    });

    it('returns the correct ID for a multi-namespaced type', () => {
      expect(
        getObjKey({
          type: 'multi',
          id: '57',
          namespaces: ['ns-1', 'ns-2'],
        })
      ).toEqual('multi:57');
    });

    it('returns the correct ID for an agnostic type', () => {
      expect(
        getObjKey({
          type: 'agnostic',
          id: '79',
        })
      ).toEqual('agnostic:79');
    });
  });

  describe('when `useProvidedNamespace=false` and `useObjectNamespaces=true`', () => {
    let getObjKey: ObjectKeyProvider;

    beforeEach(() => {
      getObjKey = getObjectKeyProvider({
        typeRegistry,
        namespace,
        useProvidedNamespace: false,
        useObjectNamespaces: true,
      });
    });

    it('returns the correct ID for a single-namespaced type with namespace specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
          namespaces: ['object-ns'],
        })
      ).toEqual('object-ns:single:42');
    });

    it('returns the correct ID for a single-namespaced type with namespace not specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
        })
      ).toEqual('single:42');
    });

    it('returns the correct ID for a multi-namespaced type', () => {
      expect(
        getObjKey({
          type: 'multi',
          id: '57',
          namespaces: ['ns-1', 'ns-2'],
        })
      ).toEqual('multi:57');
    });

    it('returns the correct ID for an agnostic type', () => {
      expect(
        getObjKey({
          type: 'agnostic',
          id: '79',
        })
      ).toEqual('agnostic:79');
    });
  });

  describe('when `useProvidedNamespace=true` and `useObjectNamespaces=false`', () => {
    let getObjKey: ObjectKeyProvider;

    beforeEach(() => {
      getObjKey = getObjectKeyProvider({
        typeRegistry,
        namespace,
        useProvidedNamespace: true,
        useObjectNamespaces: false,
      });
    });

    it('returns the correct ID for a single-namespaced type with namespace specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
          namespaces: ['object-ns'],
        })
      ).toEqual('current-ns:single:42');
    });

    it('returns the correct ID for a single-namespaced type with namespace not specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
        })
      ).toEqual('current-ns:single:42');
    });

    it('returns the correct ID for a multi-namespaced type', () => {
      expect(
        getObjKey({
          type: 'multi',
          id: '57',
          namespaces: ['ns-1', 'ns-2'],
        })
      ).toEqual('multi:57');
    });

    it('returns the correct ID for an agnostic type', () => {
      expect(
        getObjKey({
          type: 'agnostic',
          id: '79',
        })
      ).toEqual('agnostic:79');
    });
  });

  describe('when `useProvidedNamespace=false` and `useObjectNamespaces=false`', () => {
    let getObjKey: ObjectKeyProvider;

    beforeEach(() => {
      getObjKey = getObjectKeyProvider({
        typeRegistry,
        namespace,
        useProvidedNamespace: false,
        useObjectNamespaces: false,
      });
    });

    it('returns the correct ID for a single-namespaced type with namespace specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
          namespaces: ['object-ns'],
        })
      ).toEqual('single:42');
    });

    it('returns the correct ID for a single-namespaced type with namespace not specified', () => {
      expect(
        getObjKey({
          type: 'single',
          id: '42',
        })
      ).toEqual('single:42');
    });

    it('returns the correct ID for a multi-namespaced type', () => {
      expect(
        getObjKey({
          type: 'multi',
          id: '57',
          namespaces: ['ns-1', 'ns-2'],
        })
      ).toEqual('multi:57');
    });

    it('returns the correct ID for an agnostic type', () => {
      expect(
        getObjKey({
          type: 'agnostic',
          id: '79',
        })
      ).toEqual('agnostic:79');
    });
  });
});
