/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchMonacoConnectorHandler } from './elasticsearch_connector_handler';
import {
  createMockHoverContext,
  createMockStepContext,
  makeStepYaml,
  parseStepNodeFromListYaml,
} from './test_utils/mock_factories';

jest.mock('../../../../../common/schema', () => ({
  getAllConnectors: jest.fn(),
}));

jest.mock('@kbn/workflows', () => ({
  buildElasticsearchRequest: jest.fn().mockReturnValue({
    method: 'GET',
    path: '/my-index/_search',
    body: undefined,
  }),
  isInternalConnector: jest.fn().mockReturnValue(true),
}));

const { getAllConnectors } = jest.requireMock('../../../../../common/schema');
const { buildElasticsearchRequest, isInternalConnector } = jest.requireMock('@kbn/workflows');

describe('ElasticsearchMonacoConnectorHandler', () => {
  let handler: ElasticsearchMonacoConnectorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ElasticsearchMonacoConnectorHandler();

    getAllConnectors.mockReturnValue([
      {
        type: 'elasticsearch.search',
        description: 'Search for documents',
        documentation: 'https://elastic.co/guide/en/master/search-api.html',
        stability: 'ga',
        methods: ['GET'],
        patterns: ['/{index}/_search'],
      },
      {
        type: 'elasticsearch.index',
        description: 'Index a document',
        documentation: 'https://elastic.co/guide/en/{branch}/index-api.html',
        stability: 'beta',
        methods: ['PUT'],
        patterns: ['/{index}/_doc/{id}'],
      },
    ]);
    isInternalConnector.mockReturnValue(true);
    buildElasticsearchRequest.mockReturnValue({
      method: 'GET',
      path: '/my-index/_search',
      body: undefined,
    });
  });

  describe('canHandle', () => {
    it('should handle elasticsearch connector types', () => {
      expect(handler.canHandle('elasticsearch.search')).toBe(true);
      expect(handler.canHandle('elasticsearch.index')).toBe(true);
      expect(handler.canHandle('elasticsearch.indices.create')).toBe(true);
    });

    it('should not handle non-elasticsearch connector types', () => {
      expect(handler.canHandle('kibana.createSpace')).toBe(false);
      expect(handler.canHandle('http')).toBe(false);
      expect(handler.canHandle('slack')).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should have priority 100', () => {
      expect(handler.getPriority()).toBe(100);
    });
  });

  describe('generateHoverContent', () => {
    it('should return null when there is no step context', async () => {
      const context = createMockHoverContext('elasticsearch.search');
      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return hover content for a valid elasticsearch connector', async () => {
      const yaml = makeStepYaml('elasticsearch.search', { index: 'my-index' });
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('elasticsearch.search', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('GET');
      expect(result?.value).toContain('/my-index/_search');
      expect(result?.value).toContain('Console Format');
      expect(result?.isTrusted).toBe(true);
    });

    it('should include documentation URL with version replacement', async () => {
      const yaml = makeStepYaml('elasticsearch.search');
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('elasticsearch.search', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      // /master/ should be replaced with /current/
      expect(result?.value).toContain('/current/');
      expect(result?.value).not.toContain('/master/');
    });

    it('should return null when connector is not found in getAllConnectors', async () => {
      getAllConnectors.mockReturnValue([]);

      const yaml = makeStepYaml('elasticsearch.unknown_api');
      const stepContext = createMockStepContext({
        stepNode: parseStepNodeFromListYaml(yaml),
        stepType: 'elasticsearch.unknown_api',
      });
      const context = createMockHoverContext('elasticsearch.unknown_api', stepContext);

      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return null when getAllConnectors returns null', async () => {
      getAllConnectors.mockReturnValue(null);

      const yaml = makeStepYaml('elasticsearch.search');
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('elasticsearch.search', stepContext);

      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should include stability note for beta connectors', async () => {
      buildElasticsearchRequest.mockReturnValue({
        method: 'PUT',
        path: '/my-index/_doc/1',
        body: undefined,
      });

      const yaml = makeStepYaml('elasticsearch.index');
      const stepContext = createMockStepContext({
        stepNode: parseStepNodeFromListYaml(yaml),
        stepType: 'elasticsearch.index',
      });
      const context = createMockHoverContext('elasticsearch.index', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Beta');
    });

    it('should include request body in console format when present', async () => {
      buildElasticsearchRequest.mockReturnValue({
        method: 'GET',
        path: '/logs-*/_search',
        body: { query: { match_all: {} } },
      });

      const yaml = makeStepYaml('elasticsearch.search', { index: 'logs-*' });
      const stepContext = createMockStepContext({ stepNode: parseStepNodeFromListYaml(yaml) });
      const context = createMockHoverContext('elasticsearch.search', stepContext);

      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('match_all');
    });
  });

  describe('getExamples', () => {
    it('should return examples for search', () => {
      const result = handler.getExamples('elasticsearch.search');
      expect(result).not.toBeNull();
      expect(result?.params).toHaveProperty('index');
      expect(result?.params).toHaveProperty('query');
      expect(result?.snippet).toContain('type: elasticsearch.search');
    });

    it('should return examples for indices.create', () => {
      const result = handler.getExamples('elasticsearch.indices.create');
      expect(result).not.toBeNull();
      expect(result?.params).toHaveProperty('index');
      expect(result?.snippet).toContain('type: elasticsearch.indices.create');
    });

    it('should return examples for index', () => {
      const result = handler.getExamples('elasticsearch.index');
      expect(result).not.toBeNull();
      expect(result?.params).toHaveProperty('index');
      expect(result?.params).toHaveProperty('id');
      expect(result?.snippet).toContain('type: elasticsearch.index');
    });

    it('should return null for an unknown elasticsearch API', () => {
      const result = handler.getExamples('elasticsearch.unknown_api');
      expect(result).toBeNull();
    });
  });
});
