/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { getConnectorTypeSuggestions } from './get_connector_type_suggestions';

// Mock the dependencies
jest.mock('../../../connectors_cache', () => ({
  getCachedAllConnectors: jest.fn(),
}));

jest.mock('../../../snippets/generate_builtin_step_snippet', () => ({
  generateBuiltInStepSnippet: jest.fn(),
}));

jest.mock('../../../snippets/generate_connector_snippet', () => ({
  generateConnectorSnippet: jest.fn(),
}));

import { getCachedAllConnectors } from '../../../connectors_cache';
import { generateBuiltInStepSnippet } from '../../../snippets/generate_builtin_step_snippet';
import { generateConnectorSnippet } from '../../../snippets/generate_connector_snippet';

describe('getConnectorTypeSuggestions', () => {
  const mockRange: monaco.IRange = {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 6,
    endColumn: 10,
  };

  const mockDynamicConnectorTypes: Record<string, ConnectorTypeInfo> = {
    '.slack': {
      actionTypeId: '.slack',
      displayName: 'Slack',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      subActions: [],
      instances: [
        { id: 'slack-1', name: 'Main Slack', isPreconfigured: false, isDeprecated: false },
      ],
    },
    '.inference': {
      actionTypeId: '.inference',
      displayName: 'Inference',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      minimumLicenseRequired: 'basic',
      subActions: [],
      instances: [],
    },
  };

  const mockConnectors = [
    { type: '.slack', description: 'Slack connector' },
    { type: '.inference', description: 'Inference connector (no instances configured)' },
    { type: 'elasticsearch.index', description: 'Index documents' },
    { type: 'elasticsearch.search', description: 'Search documents' },
    { type: 'kibana.alert', description: 'Create alerts' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (getCachedAllConnectors as jest.Mock).mockReturnValue(mockConnectors);
    (generateBuiltInStepSnippet as jest.Mock).mockImplementation((type) => `${type}:\n  # snippet`);
    (generateConnectorSnippet as jest.Mock).mockImplementation(
      (type) => `${type}:\n  connector-id: my-connector`
    );
  });

  describe('basic functionality', () => {
    it('should return empty array when no prefix is provided', () => {
      const result = getConnectorTypeSuggestions('', mockRange);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'foreach',
            kind: monaco.languages.CompletionItemKind.Method,
          }),
          expect.objectContaining({
            label: 'if',
            kind: monaco.languages.CompletionItemKind.Keyword,
          }),
          expect.objectContaining({
            label: 'parallel',
            kind: monaco.languages.CompletionItemKind.Class,
          }),
          expect.objectContaining({
            label: 'merge',
            kind: monaco.languages.CompletionItemKind.Interface,
          }),
          expect.objectContaining({
            label: 'http',
            kind: monaco.languages.CompletionItemKind.Reference,
          }),
          expect.objectContaining({
            label: 'wait',
            kind: monaco.languages.CompletionItemKind.Constant,
          }),
        ])
      );
    });

    it('should include both built-in steps and connectors when no prefix', () => {
      const result = getConnectorTypeSuggestions('', mockRange);

      // Check for built-in steps
      const builtInSteps = result.filter((s) =>
        ['foreach', 'if', 'parallel', 'merge', 'http', 'wait'].includes(s.label as string)
      );
      expect(builtInSteps).toHaveLength(6);

      // Check for connectors
      const connectorSuggestions = result.filter(
        (s) => !['foreach', 'if', 'parallel', 'merge', 'http', 'wait'].includes(s.label as string)
      );
      expect(connectorSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('filtering by prefix', () => {
    it('should filter built-in steps by prefix', () => {
      const result = getConnectorTypeSuggestions('for', mockRange);
      const foreachSuggestion = result.find((s) => s.label === 'foreach');
      expect(foreachSuggestion).toBeDefined();
      expect(foreachSuggestion).toMatchObject({
        label: 'foreach',
        kind: monaco.languages.CompletionItemKind.Method,
        detail: 'Built-in workflow step',
        documentation: 'Execute steps for each item in a collection',
      });
    });

    it('should filter connectors by prefix', () => {
      const result = getConnectorTypeSuggestions('sla', mockRange);
      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion).toBeDefined();
      expect(slackSuggestion).toMatchObject({
        label: 'Slack',
        detail: '.slack',
        documentation: 'Slack connector',
      });
    });

    it('should handle elasticsearch namespace prefix', () => {
      const result = getConnectorTypeSuggestions('elasticsearch.', mockRange);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'elasticsearch.index',
            detail: 'elasticsearch.index',
            documentation: 'Elasticsearch API - index',
          }),
          expect.objectContaining({
            label: 'elasticsearch.search',
            detail: 'elasticsearch.search',
            documentation: 'Elasticsearch API - search',
          }),
        ])
      );
    });

    it('should handle kibana namespace prefix', () => {
      const result = getConnectorTypeSuggestions('kibana.', mockRange);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'kibana.alert',
        detail: 'kibana.alert',
        documentation: 'Kibana API - alert',
      });
    });

    it('should match elasticsearch APIs without full prefix', () => {
      const result = getConnectorTypeSuggestions('ind', mockRange);
      const indexSuggestion = result.find((s) => s.label === 'elasticsearch.index');
      expect(indexSuggestion).toBeDefined();
    });
  });

  describe('snippet generation', () => {
    it('should generate snippets for built-in steps', () => {
      const result = getConnectorTypeSuggestions('if', mockRange);
      const ifSuggestion = result.find((s) => s.label === 'if');
      expect(ifSuggestion?.insertText).toBe('if:\n  # snippet');
      expect(generateBuiltInStepSnippet).toHaveBeenCalledWith('if');
    });

    it('should generate snippets for connectors', () => {
      const result = getConnectorTypeSuggestions('slack', mockRange, mockDynamicConnectorTypes);
      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion?.insertText).toBe('.slack:\n  connector-id: my-connector');
      expect(generateConnectorSnippet).toHaveBeenCalledWith(
        '.slack',
        {},
        mockDynamicConnectorTypes
      );
    });

    it('should use extended range for multi-line insertions', () => {
      const result = getConnectorTypeSuggestions('', mockRange);
      const suggestion = result[0];
      expect(suggestion.range).toEqual({
        startLineNumber: 1,
        endLineNumber: 1,
        startColumn: 6,
        endColumn: 1000,
      });
    });
  });

  describe('dynamic connector types', () => {
    it('should use display names for dynamic connectors', () => {
      const result = getConnectorTypeSuggestions('', mockRange, mockDynamicConnectorTypes);
      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion).toMatchObject({
        label: 'Slack',
        detail: '.slack',
      });
    });

    it('should strip "connector" and "(no instances configured)" from display names', () => {
      const result = getConnectorTypeSuggestions('inf', mockRange, mockDynamicConnectorTypes);
      const inferenceSuggestion = result.find((s) => s.detail === '.inference');
      expect(inferenceSuggestion).toMatchObject({
        label: 'Inference',
        detail: '.inference',
      });
    });

    it('should not use display names for elasticsearch connectors', () => {
      const result = getConnectorTypeSuggestions('', mockRange, mockDynamicConnectorTypes);
      const elasticsearchSuggestion = result.find((s) => s.label === 'elasticsearch.index');
      expect(elasticsearchSuggestion).toMatchObject({
        label: 'elasticsearch.index',
        detail: 'elasticsearch.index',
      });
    });

    it('should not use display names for kibana connectors', () => {
      const result = getConnectorTypeSuggestions('', mockRange, mockDynamicConnectorTypes);
      const kibanaSuggestion = result.find((s) => s.label === 'kibana.alert');
      expect(kibanaSuggestion).toMatchObject({
        label: 'kibana.alert',
        detail: 'kibana.alert',
      });
    });
  });

  describe('completion item properties', () => {
    it('should set correct completion kinds for different connector types', () => {
      const result = getConnectorTypeSuggestions('', mockRange);

      const elasticsearchSuggestion = result.find((s) => s.label === 'elasticsearch.index');
      expect(elasticsearchSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Struct);

      const kibanaSuggestion = result.find((s) => s.label === 'kibana.alert');
      expect(kibanaSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Module);

      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Function);
    });

    it('should set insertTextRules to InsertAsSnippet', () => {
      const result = getConnectorTypeSuggestions('', mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.insertTextRules).toBe(
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        );
      });
    });

    it('should set sortText with priority prefix', () => {
      const result = getConnectorTypeSuggestions('', mockRange);

      const ifSuggestion = result.find((s) => s.label === 'if');
      expect(ifSuggestion?.sortText).toBe('!if');

      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion?.sortText).toBe('!.slack');
    });

    it('should set filterText to match the type', () => {
      const result = getConnectorTypeSuggestions('', mockRange);

      const ifSuggestion = result.find((s) => s.label === 'if');
      expect(ifSuggestion?.filterText).toBe('if');

      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion?.filterText).toBe('.slack');
    });

    it('should not set preselect', () => {
      const result = getConnectorTypeSuggestions('', mockRange);
      result.forEach((suggestion) => {
        expect(suggestion.preselect).toBe(false);
      });
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      // Clear all mocks before each caching test
      jest.clearAllMocks();
      // Also need to clear the internal cache of the function under test
      // Since we can't access the cache directly, we'll just note that tests
      // may be affected by previous test runs
    });

    it('should cache results for the same prefix and range', () => {
      // Use a unique prefix that hasn't been used in other tests to avoid cache pollution
      const uniquePrefix = 'uniquetest1';

      // First call
      const result1 = getConnectorTypeSuggestions(uniquePrefix, mockRange);
      const callCount1 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      // Second call with same parameters - should use cache
      const result2 = getConnectorTypeSuggestions(uniquePrefix, mockRange);
      const callCount2 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      // Due to caching, getCachedAllConnectors should NOT be called again
      expect(callCount2).toBe(callCount1);
      expect(result2).toEqual(result1);
    });

    it('should not use cache for different prefixes', () => {
      // Use unique prefixes to avoid interference
      const prefix1 = 'uniquetest2';
      const prefix2 = 'uniquetest3';

      getConnectorTypeSuggestions(prefix1, mockRange);
      const callCount1 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      getConnectorTypeSuggestions(prefix2, mockRange);
      const callCount2 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      // Different prefix means new function call, so getCachedAllConnectors is called again
      expect(callCount2).toBe(callCount1 + 1);
    });

    it('should not use cache for different ranges', () => {
      const differentRange = { ...mockRange, startColumn: 10 };
      const uniquePrefix = 'uniquetest4';

      getConnectorTypeSuggestions(uniquePrefix, mockRange);
      const callCount1 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      getConnectorTypeSuggestions(uniquePrefix, differentRange);
      const callCount2 = (getCachedAllConnectors as jest.Mock).mock.calls.length;

      // Different range means new cache key, so getCachedAllConnectors is called again
      expect(callCount2).toBe(callCount1 + 1);
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive matching', () => {
      const result = getConnectorTypeSuggestions('SLACK', mockRange);
      const slackSuggestion = result.find((s) => s.detail === '.slack');
      expect(slackSuggestion).toBeDefined();
    });

    it('should handle partial matches in the middle of the type', () => {
      const result = getConnectorTypeSuggestions('arch', mockRange);
      const searchSuggestion = result.find((s) => s.label === 'elasticsearch.search');
      expect(searchSuggestion).toBeDefined();
    });

    it('should handle empty connector list', () => {
      (getCachedAllConnectors as jest.Mock).mockReturnValue([]);
      const result = getConnectorTypeSuggestions('', mockRange);
      // Should still have built-in steps
      expect(result.length).toBeGreaterThanOrEqual(6);
    });

    it('should handle connectors without descriptions', () => {
      (getCachedAllConnectors as jest.Mock).mockReturnValue([
        { type: '.custom' }, // No description
      ]);
      const result = getConnectorTypeSuggestions('custom', mockRange);
      const customSuggestion = result.find((s) => s.detail === '.custom');
      expect(customSuggestion).toMatchObject({
        label: '.custom',
        documentation: 'Workflow connector - .custom',
      });
    });
  });
});
