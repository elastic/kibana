/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsManagement } from './management';
import { SavedObjectsType, SavedObjectTypeRegistry } from '@kbn/core/server';

describe('SavedObjectsManagement', () => {
  let registry: SavedObjectTypeRegistry;
  let management: SavedObjectsManagement;

  const registerType = (type: Partial<SavedObjectsType>) =>
    registry.registerType({
      name: 'unknown',
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      migrations: {},
      ...type,
    });

  beforeEach(() => {
    registry = new SavedObjectTypeRegistry();
    management = new SavedObjectsManagement(registry);
  });

  describe('isImportAndExportable()', () => {
    it('returns false for unknown types', () => {
      const result = management.isImportAndExportable('bar');
      expect(result).toBe(false);
    });

    it('returns true for explicitly importable and exportable type', () => {
      registerType({
        name: 'foo',
        management: {
          importableAndExportable: true,
        },
      });

      const result = management.isImportAndExportable('foo');
      expect(result).toBe(true);
    });

    it('returns false for explicitly importable and exportable type', () => {
      registerType({
        name: 'foo',
        management: {
          importableAndExportable: false,
        },
      });

      const result = management.isImportAndExportable('foo');
      expect(result).toBe(false);
    });
  });

  describe('getDefaultSearchField()', () => {
    it('returns empty for unknown types', () => {
      const result = management.getDefaultSearchField('bar');
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({
        name: 'foo',
        management: {
          defaultSearchField: 'value',
        },
      });

      const result = management.getDefaultSearchField('foo');
      expect(result).toEqual('value');
    });
  });

  describe('getIcon()', () => {
    it('returns empty for unknown types', () => {
      const result = management.getIcon('bar');
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({
        name: 'foo',
        management: {
          icon: 'value',
        },
      });
      const result = management.getIcon('foo');
      expect(result).toEqual('value');
    });
  });

  describe('getTitle()', () => {
    it('returns empty for unknown type', () => {
      const result = management.getTitle({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({
        name: 'foo',
        management: {
          getTitle() {
            return 'called';
          },
        },
      });
      const result = management.getTitle({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual('called');
    });
  });

  describe('getEditUrl()', () => {
    it('returns empty for unknown type', () => {
      const result = management.getEditUrl({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({
        name: 'foo',
        management: {
          getEditUrl() {
            return 'called';
          },
        },
      });

      const result = management.getEditUrl({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual('called');
    });
  });

  describe('getInAppUrl()', () => {
    it('returns empty array for unknown type', () => {
      const result = management.getInAppUrl({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({
        name: 'foo',
        management: {
          getInAppUrl() {
            return { path: 'called', uiCapabilitiesPath: 'my.path' };
          },
        },
      });

      const result = management.getInAppUrl({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual({ path: 'called', uiCapabilitiesPath: 'my.path' });
    });
  });

  describe('getNamespaceType()', () => {
    it('returns empty for unknown type', () => {
      const result = management.getNamespaceType({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual(undefined);
    });

    it('returns explicit value', () => {
      registerType({ name: 'foo', namespaceType: 'single' });

      const result = management.getNamespaceType({
        id: '1',
        type: 'foo',
        attributes: {},
        references: [],
      });
      expect(result).toEqual('single');
    });
  });
});
