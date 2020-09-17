/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectsManagement } from './management';
import { SavedObjectsType, SavedObjectTypeRegistry } from '../../../../core/server';

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
