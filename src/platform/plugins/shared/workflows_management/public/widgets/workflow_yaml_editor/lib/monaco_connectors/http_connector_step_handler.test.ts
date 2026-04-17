/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpMonacoConnectorStepHandler } from './http_connector_step_handler';
import { createMockHoverContext, createMockStepContext } from './test_utils/mock_factories';

describe('HttpMonacoConnectorStepHandler', () => {
  let handler: HttpMonacoConnectorStepHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new HttpMonacoConnectorStepHandler();
  });

  describe('canHandle', () => {
    it('should handle http connector types', () => {
      expect(handler.canHandle('http')).toBe(true);
      expect(handler.canHandle('http_post')).toBe(true);
    });

    it('should not handle non-http connector types', () => {
      expect(handler.canHandle('elasticsearch.search')).toBe(false);
      expect(handler.canHandle('kibana.createSpace')).toBe(false);
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
      const context = createMockHoverContext('http');
      const result = await handler.generateHoverContent(context);
      expect(result).toBeNull();
    });

    it('should return hover content for an http connector', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('http', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('http');
      expect(result?.value).toContain('HTTP');
      expect(result?.value).toContain('Usage Modes');
      expect(result?.isTrusted).toBe(true);
    });

    it('should include connector-id usage mode documentation', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('http', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('connector-id');
      expect(result?.value).toContain('Recommended');
    });

    it('should include direct URL legacy mode documentation', async () => {
      const stepContext = createMockStepContext();
      const context = createMockHoverContext('http', stepContext);
      const result = await handler.generateHoverContent(context);

      expect(result).not.toBeNull();
      expect(result?.value).toContain('Direct URL');
      expect(result?.value).toContain('Legacy');
    });

    it('should return null for an unknown HTTP-like connector', async () => {
      const stepContext = createMockStepContext({ stepType: 'http_unknown' });
      const context = createMockHoverContext('http_unknown', stepContext);
      const result = await handler.generateHoverContent(context);

      // getConnectorInfo returns null for non-'http' types
      expect(result).toBeNull();
    });
  });

  describe('getExamples', () => {
    it('should return examples for the http connector type', () => {
      const result = handler.getExamples('http');
      expect(result).not.toBeNull();
      expect(result?.snippet).toContain('connector-id');
      expect(result?.snippet).toContain('type: http');
      expect(result?.snippet).toContain('Legacy format');
    });

    it('should include both connector-id and direct URL params', () => {
      const result = handler.getExamples('http');
      expect(result).not.toBeNull();
      // connector-id params use path instead of url
      expect(result?.params).toHaveProperty('path');
      expect(result?.params).toHaveProperty('method');
    });

    it('should return null for an unknown connector type', () => {
      const result = handler.getExamples('unknown_http');
      expect(result).toBeNull();
    });
  });
});
