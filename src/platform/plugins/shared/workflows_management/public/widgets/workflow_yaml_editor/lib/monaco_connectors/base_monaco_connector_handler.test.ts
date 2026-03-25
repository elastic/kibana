/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Concrete subclass to test the abstract BaseMonacoConnectorHandler
 */
class TestHandler extends BaseMonacoConnectorHandler {
  constructor(name = 'TestHandler', priority = 50, prefixes = ['test.']) {
    super(name, priority, prefixes);
  }

  async generateHoverContent(_context: HoverContext): Promise<monaco.IMarkdownString | null> {
    return null;
  }

  getExamples(_connectorType: string): ConnectorExamples | null {
    return null;
  }

  // Expose protected methods for testing
  public exposedCreateMarkdownContent(content: string): monaco.IMarkdownString {
    return this.createMarkdownContent(content);
  }

  public exposedIsInContext(context: HoverContext, expectedPath: string[]): boolean {
    return this.isInContext(context, expectedPath);
  }

  public exposedGetStepInfo(context: HoverContext) {
    return this.getStepInfo(context);
  }

  public exposedFormatConnectorType(connectorType: string): string {
    return this.formatConnectorType(connectorType);
  }

  public exposedCreateParameterDocumentation(
    paramName: string,
    paramType: string,
    description?: string,
    examples?: Array<string | Record<string, unknown>>
  ): string {
    return this.createParameterDocumentation(paramName, paramType, description, examples);
  }

  public exposedGetStabilityNote(
    stability: 'tech_preview' | 'beta' | 'stable' | undefined
  ): string {
    return this.getStabilityNote(stability);
  }

  public exposedCreateConnectorOverview(
    connectorType: string,
    description: string,
    additionalInfo?: string[]
  ): string {
    return this.createConnectorOverview(connectorType, description, additionalInfo);
  }
}

describe('BaseMonacoConnectorHandler', () => {
  let handler: TestHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TestHandler();
  });

  describe('canHandle', () => {
    it('should return true when connector type starts with a supported prefix', () => {
      expect(handler.canHandle('test.search')).toBe(true);
      expect(handler.canHandle('test.index')).toBe(true);
    });

    it('should return false when connector type does not match any prefix', () => {
      expect(handler.canHandle('elasticsearch.search')).toBe(false);
      expect(handler.canHandle('kibana.createSpace')).toBe(false);
    });

    it('should support multiple prefixes', () => {
      const multiPrefixHandler = new TestHandler('Multi', 50, ['alpha.', 'beta.']);
      expect(multiPrefixHandler.canHandle('alpha.one')).toBe(true);
      expect(multiPrefixHandler.canHandle('beta.two')).toBe(true);
      expect(multiPrefixHandler.canHandle('gamma.three')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should return the configured priority', () => {
      expect(handler.getPriority()).toBe(50);
    });

    it('should return a different priority for different instances', () => {
      const highPriority = new TestHandler('High', 100, ['high.']);
      const lowPriority = new TestHandler('Low', 1, ['low.']);
      expect(highPriority.getPriority()).toBe(100);
      expect(lowPriority.getPriority()).toBe(1);
    });
  });

  describe('createMarkdownContent', () => {
    it('should return a markdown string with isTrusted and supportHtml', () => {
      const result = handler.exposedCreateMarkdownContent('Hello **world**');
      expect(result).toEqual({
        value: 'Hello **world**',
        isTrusted: true,
        supportHtml: true,
      });
    });
  });

  describe('isInContext', () => {
    it('should return true when yaml path matches expected path', () => {
      const context = createMockHoverContext('test.type', undefined, {
        yamlPath: ['steps', 'search', 'with'],
      });
      expect(handler.exposedIsInContext(context, ['steps', 'search'])).toBe(true);
    });

    it('should return true when yaml path exactly matches expected path', () => {
      const context = createMockHoverContext('test.type', undefined, {
        yamlPath: ['steps', 'search'],
      });
      expect(handler.exposedIsInContext(context, ['steps', 'search'])).toBe(true);
    });

    it('should return false when yaml path is shorter than expected', () => {
      const context = createMockHoverContext('test.type', undefined, {
        yamlPath: ['steps'],
      });
      expect(handler.exposedIsInContext(context, ['steps', 'search'])).toBe(false);
    });

    it('should return false when yaml path does not match expected path', () => {
      const context = createMockHoverContext('test.type', undefined, {
        yamlPath: ['triggers', 'webhook'],
      });
      expect(handler.exposedIsInContext(context, ['steps', 'search'])).toBe(false);
    });

    it('should return true for empty expected path', () => {
      const context = createMockHoverContext('test.type', undefined, {
        yamlPath: ['steps'],
      });
      expect(handler.exposedIsInContext(context, [])).toBe(true);
    });
  });

  describe('getStepInfo', () => {
    it('should extract step info from context with step context', () => {
      const stepContext = createMockStepContext({
        stepName: 'search_step',
        stepType: 'elasticsearch.search',
        isInWithBlock: true,
      });
      const context = createMockHoverContext('elasticsearch.search', stepContext);

      const result = handler.exposedGetStepInfo(context);
      expect(result).toEqual({
        stepName: 'search_step',
        stepType: 'elasticsearch.search',
        isInWithBlock: true,
      });
    });

    it('should return undefined step fields when no step context', () => {
      const context = createMockHoverContext('test.type');

      const result = handler.exposedGetStepInfo(context);
      expect(result).toEqual({
        stepName: undefined,
        stepType: undefined,
        isInWithBlock: false,
      });
    });

    it('should default isInWithBlock to false when not specified', () => {
      const stepContext = createMockStepContext({
        stepName: 'step1',
        stepType: 'http',
        isInWithBlock: false,
      });
      const context = createMockHoverContext('http', stepContext);

      const result = handler.exposedGetStepInfo(context);
      expect(result.isInWithBlock).toBe(false);
    });
  });

  describe('formatConnectorType', () => {
    it('should remove elasticsearch prefix and format', () => {
      expect(handler.exposedFormatConnectorType('elasticsearch.search')).toBe('Search');
    });

    it('should remove kibana prefix and format', () => {
      expect(handler.exposedFormatConnectorType('kibana.createSpace')).toBe('CreateSpace');
    });

    it('should replace underscores with spaces and capitalize', () => {
      expect(handler.exposedFormatConnectorType('my_custom_action')).toBe('My Custom Action');
    });

    it('should handle types without prefixes', () => {
      expect(handler.exposedFormatConnectorType('http')).toBe('Http');
    });
  });

  describe('createParameterDocumentation', () => {
    it('should create basic parameter documentation', () => {
      const result = handler.exposedCreateParameterDocumentation('index', 'string');
      expect(result).toContain('**Parameter**: `index` (string)');
    });

    it('should include description when provided', () => {
      const result = handler.exposedCreateParameterDocumentation(
        'index',
        'string',
        'The target index'
      );
      expect(result).toContain('The target index');
    });

    it('should include string examples', () => {
      const result = handler.exposedCreateParameterDocumentation('index', 'string', undefined, [
        'logs-*',
        'metrics-*',
      ]);
      expect(result).toContain('**Examples:**');
      expect(result).toContain('- `logs-*`');
      expect(result).toContain('- `metrics-*`');
    });

    it('should include object examples as JSON', () => {
      const result = handler.exposedCreateParameterDocumentation('query', 'object', undefined, [
        { match_all: {} },
      ]);
      expect(result).toContain('**Examples:**');
      expect(result).toContain('`{"match_all":{}}`');
    });

    it('should limit examples to 3', () => {
      const result = handler.exposedCreateParameterDocumentation('index', 'string', undefined, [
        'a',
        'b',
        'c',
        'd',
        'e',
      ]);
      const lines = result.split('\n');
      const exampleLines = lines.filter((l) => l.startsWith('- `'));
      expect(exampleLines).toHaveLength(3);
    });
  });

  describe('getStabilityNote', () => {
    it('should return tech preview note for tech_preview stability', () => {
      const result = handler.exposedGetStabilityNote('tech_preview');
      expect(result).toContain('Tech Preview');
    });

    it('should return beta note for beta stability', () => {
      const result = handler.exposedGetStabilityNote('beta');
      expect(result).toContain('Beta');
    });

    it('should return empty string for stable stability', () => {
      const result = handler.exposedGetStabilityNote('stable');
      expect(result).toBe('');
    });

    it('should return tech preview note for undefined stability (defaults to tech_preview)', () => {
      const result = handler.exposedGetStabilityNote(undefined);
      expect(result).toContain('Tech Preview');
    });
  });

  describe('createConnectorOverview', () => {
    it('should create overview with connector type and description', () => {
      const result = handler.exposedCreateConnectorOverview(
        'elasticsearch.search',
        'Search documents'
      );
      expect(result).toContain('**Connector**: `elasticsearch.search`');
      expect(result).toContain('Search documents');
    });

    it('should include additional info when provided', () => {
      const result = handler.exposedCreateConnectorOverview(
        'elasticsearch.search',
        'Search documents',
        ['Supports pagination', 'Returns up to 10,000 hits']
      );
      expect(result).toContain('Supports pagination');
      expect(result).toContain('Returns up to 10,000 hits');
    });

    it('should handle no additional info', () => {
      const result = handler.exposedCreateConnectorOverview(
        'elasticsearch.search',
        'Search documents'
      );
      expect(result).not.toContain('undefined');
    });
  });
});
