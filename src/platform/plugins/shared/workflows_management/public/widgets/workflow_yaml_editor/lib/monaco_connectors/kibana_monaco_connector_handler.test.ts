/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaMonacoConnectorHandler } from './kibana_monaco_connector_handler';
import {
  createMockHoverContext,
  createMockStepContext,
  makeStepYaml,
  parseStepNodeFromListYaml,
} from './test_utils/mock_factories';
import type { ConnectorExamples } from '../monaco_providers/provider_interfaces';

jest.mock('../../../../../common/schema', () => ({
  getAllConnectors: jest.fn(),
}));

jest.mock('@kbn/workflows', () => ({
  isInternalConnector: jest.fn().mockReturnValue(true),
}));

const { getAllConnectors } = jest.requireMock('../../../../../common/schema');
const { isInternalConnector } = jest.requireMock('@kbn/workflows');

describe('KibanaMonacoConnectorHandler', () => {
  let handler: KibanaMonacoConnectorHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    getAllConnectors.mockReturnValue([
      {
        type: 'kibana.createSpace',
        description: 'Create a new Kibana space',
        documentation: 'https://elastic.co/guide/en/master/spaces-api.html',
        stability: 'ga',
        methods: ['POST'],
        patterns: ['/api/spaces/space'],
      },
      {
        type: 'kibana.getRules',
        description: 'Get alerting rules',
        documentation: 'https://elastic.co/guide/en/{branch}/rules-api.html',
        stability: 'tech_preview',
        methods: ['GET'],
        patterns: ['/api/alerting/rules/_find'],
      },
    ]);
    isInternalConnector.mockReturnValue(true);

    handler = new KibanaMonacoConnectorHandler();
  });

  describe('canHandle', () => {
    it('should handle kibana connector types', () => {
      expect(handler.canHandle('kibana.createSpace')).toBe(true);
      expect(handler.canHandle('kibana.getRules')).toBe(true);
    });

    it('should not handle non-kibana connector types', () => {
      expect(handler.canHandle('elasticsearch.search')).toBe(false);
      expect(handler.canHandle('http')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should have priority 90', () => {
      expect(handler.getPriority()).toBe(90);
    });
  });

  describe('generateHoverContent', () => {
    it('should return null when there is no step context', async () => {
      const context = createMockHoverContext('kibana.createSpace');
      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return hover content for a valid kibana connector', async () => {
      const yaml = makeStepYaml('kibana.createSpace', { name: 'my-space' });
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('kibana.createSpace', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('POST');
      expect(result?.value).toContain('/api/spaces/space');
      expect(result?.value).toContain('Create a new Kibana space');
      expect(result?.isTrusted).toBe(true);
    });

    it('should include documentation URL with version replacement', async () => {
      const yaml = makeStepYaml('kibana.createSpace');
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('kibana.createSpace', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('/current/');
      expect(result?.value).not.toContain('/master/');
    });

    it('should include stability note for tech_preview connectors', async () => {
      const yaml = makeStepYaml('kibana.getRules');
      const stepContext = createMockStepContext({
        stepNode: parseStepNodeFromListYaml(yaml),
        stepType: 'kibana.getRules',
      });
      const context = createMockHoverContext('kibana.getRules', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Tech Preview');
    });

    it('should return null when connector is not found', async () => {
      getAllConnectors.mockReturnValue([]);

      const yaml = makeStepYaml('kibana.unknownApi');
      const stepContext = createMockStepContext({
        stepNode: parseStepNodeFromListYaml(yaml),
        stepType: 'kibana.unknownApi',
      });
      const context = createMockHoverContext('kibana.unknownApi', stepContext);

      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should include request example with with-params', async () => {
      const yaml = makeStepYaml('kibana.createSpace', {
        name: 'my-space',
        id: 'my-space-id',
      });
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('kibana.createSpace', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Request Example');
      expect(result?.value).toContain('Content-Type: application/json');
      expect(result?.value).toContain('kbn-xsrf: true');
    });
  });

  describe('getExamples', () => {
    it('should return null when no examples are configured', () => {
      handler = new KibanaMonacoConnectorHandler();
      const result = handler.getExamples('kibana.createSpace');
      expect(result).toBeNull();
    });

    it('should return examples from generated connectors', () => {
      const mockExamples: ConnectorExamples = {
        params: { name: 'test-space' },
        snippet: '- name: create_space\n  type: kibana.createSpace\n  with:\n    name: test-space',
      };

      handler = new KibanaMonacoConnectorHandler({
        generatedConnectors: [
          {
            type: 'kibana.createSpace',
            examples: mockExamples,
          },
        ],
      });

      const result = handler.getExamples('kibana.createSpace');
      expect(result).not.toBeNull();
      expect(result?.params).toEqual({ name: 'test-space' });
      expect(result?.snippet).toContain('kibana.createSpace');
    });

    it('should return null for connectors without examples', () => {
      handler = new KibanaMonacoConnectorHandler({
        generatedConnectors: [
          {
            type: 'kibana.createSpace',
          },
        ],
      });

      const result = handler.getExamples('kibana.createSpace');
      expect(result).toBeNull();
    });
  });

  describe('constructor options', () => {
    it('should process generated connectors to extract examples', () => {
      const mockExamples: ConnectorExamples = {
        params: { query: 'test' },
      };

      handler = new KibanaMonacoConnectorHandler({
        generatedConnectors: [
          { type: 'kibana.search', examples: mockExamples },
          { type: 'kibana.noExamples' },
        ],
      });

      expect(handler.getExamples('kibana.search')).not.toBeNull();
      expect(handler.getExamples('kibana.noExamples')).toBeNull();
    });

    it('should handle empty generated connectors array', () => {
      handler = new KibanaMonacoConnectorHandler({
        generatedConnectors: [],
      });
      expect(handler.getExamples('kibana.anything')).toBeNull();
    });

    it('should handle missing options', () => {
      handler = new KibanaMonacoConnectorHandler();
      expect(handler.canHandle('kibana.test')).toBe(true);
    });
  });
});
