/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ANALYTICS_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CONSOLE_SNIPPET_SAVED_OBJECT_TYPE } from '../../common/constants';
import { consoleSnippetSavedObjectType } from './console_snippet';

describe('Console Snippet Saved Object Type', () => {
  it('should have correct type name', () => {
    expect(consoleSnippetSavedObjectType.name).toBe(CONSOLE_SNIPPET_SAVED_OBJECT_TYPE);
  });

  it('should use analytics index pattern', () => {
    expect(consoleSnippetSavedObjectType.indexPattern).toBe(ANALYTICS_SAVED_OBJECT_INDEX);
  });

  it('should not be hidden', () => {
    expect(consoleSnippetSavedObjectType.hidden).toBe(false);
  });

  it('should be isolated by namespace', () => {
    expect(consoleSnippetSavedObjectType.namespaceType).toBe('multiple-isolated');
  });

  it('should have convertToMultiNamespaceTypeVersion set', () => {
    expect(consoleSnippetSavedObjectType.convertToMultiNamespaceTypeVersion).toBe('8.0.0');
  });

  describe('management configuration', () => {
    it('should have console icon', () => {
      expect(consoleSnippetSavedObjectType.management?.icon).toBe('console');
    });

    it('should use title as default search field', () => {
      expect(consoleSnippetSavedObjectType.management?.defaultSearchField).toBe('title');
    });

    it('should be importable and exportable', () => {
      expect(consoleSnippetSavedObjectType.management?.importableAndExportable).toBe(true);
    });

    it('should extract title from attributes', () => {
      const obj = {
        id: 'test-id',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: { title: 'Test Snippet' },
        references: [],
      };
      expect(consoleSnippetSavedObjectType.management?.getTitle?.(obj)).toBe('Test Snippet');
    });

    it('should generate correct in-app URL', () => {
      const obj = {
        id: 'test-id-123',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: { title: 'Test Snippet' },
        references: [],
      };
      const inAppUrl = consoleSnippetSavedObjectType.management?.getInAppUrl?.(obj);
      expect(inAppUrl?.path).toBe('/app/dev_tools#/console?loadSnippet=test-id-123');
      expect(inAppUrl?.uiCapabilitiesPath).toBe('dev_tools.show');
    });

    it('should properly encode snippet ID in URL', () => {
      const obj = {
        id: 'test id with spaces',
        type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
        attributes: { title: 'Test Snippet' },
        references: [],
      };
      const inAppUrl = consoleSnippetSavedObjectType.management?.getInAppUrl?.(obj);
      expect(inAppUrl?.path).toContain(encodeURIComponent('test id with spaces'));
    });
  });

  describe('mappings', () => {
    it('should have dynamic mapping disabled', () => {
      expect(consoleSnippetSavedObjectType.mappings.dynamic).toBe(false);
    });

    it('should have all required field mappings', () => {
      const properties = consoleSnippetSavedObjectType.mappings.properties;
      expect(properties).toHaveProperty('title');
      expect(properties).toHaveProperty('titleKeyword');
      expect(properties).toHaveProperty('description');
      expect(properties).toHaveProperty('query');
      expect(properties).toHaveProperty('endpoint');
      expect(properties).toHaveProperty('method');
      expect(properties).toHaveProperty('tags');
      expect(properties).toHaveProperty('createdBy');
      expect(properties).toHaveProperty('updatedBy');
    });

    it('should have correct field types', () => {
      const properties = consoleSnippetSavedObjectType.mappings.properties;
      expect(properties.title).toEqual({ type: 'text' });
      expect(properties.titleKeyword).toEqual({ type: 'keyword' });
      expect(properties.description).toEqual({ type: 'text' });
      expect(properties.query).toEqual({ type: 'text' });
      expect(properties.endpoint).toEqual({ type: 'keyword' });
      expect(properties.method).toEqual({ type: 'keyword' });
      expect(properties.tags).toEqual({ type: 'keyword' });
      expect(properties.createdBy).toEqual({ type: 'keyword' });
      expect(properties.updatedBy).toEqual({ type: 'keyword' });
    });
  });

  describe('model versions', () => {
    it('should have version 1 defined', () => {
      expect(consoleSnippetSavedObjectType.modelVersions).toHaveProperty('1');
    });

    it('should have schemas for version 1', () => {
      const modelVersions = consoleSnippetSavedObjectType.modelVersions;
      if (typeof modelVersions === 'function') {
        // Skip if it's a provider function
        return;
      }
      const version1 = modelVersions?.[1];
      expect(version1?.schemas).toHaveProperty('forwardCompatibility');
      expect(version1?.schemas).toHaveProperty('create');
    });

    it('should have no changes for version 1', () => {
      const modelVersions = consoleSnippetSavedObjectType.modelVersions;
      if (typeof modelVersions === 'function') {
        // Skip if it's a provider function
        return;
      }
      const version1 = modelVersions?.[1];
      expect(version1?.changes).toEqual([]);
    });
  });
});
