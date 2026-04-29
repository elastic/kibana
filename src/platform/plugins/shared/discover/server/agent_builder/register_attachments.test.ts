/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResolverFormatContext } from '@kbn/agent-context-layer-common';
import type { ResolverTypeDefinition } from '@kbn/agent-builder-server';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../common/agent_builder';
import { registerAttachments } from './register_attachments';

const createMockAgentContextLayer = () => {
  const registeredTypes: ResolverTypeDefinition[] = [];
  return {
    mock: {
      registerResolverType: jest.fn((type: ResolverTypeDefinition) => {
        registeredTypes.push(type);
      }),
      registerType: jest.fn(),
    } as unknown as AgentContextLayerPluginSetup,
    getRegisteredType: () => registeredTypes[0],
  };
};

const createFormatContext = (): ResolverFormatContext => ({
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'default',
});

const createAttachment = (data: Record<string, unknown>): Attachment => ({
  id: 'test',
  type: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
  data,
});

describe('registerAttachments', () => {
  let attachmentType: ResolverTypeDefinition;

  beforeAll(() => {
    const { mock, getRegisteredType } = createMockAgentContextLayer();
    registerAttachments(mock);
    attachmentType = getRegisteredType();
  });

  it('registers the attachment type with the correct id', () => {
    expect(attachmentType.id).toBe(ESQL_QUERY_RESULTS_ATTACHMENT_TYPE);
  });

  it('exposes generateEsql, executeEsql, and createVisualization tools', () => {
    expect(attachmentType.getTools?.()).toEqual([
      platformCoreTools.generateEsql,
      platformCoreTools.executeEsql,
      platformCoreTools.createVisualization,
    ]);
  });

  describe('validate', () => {
    it('accepts valid ES|QL query results data', () => {
      const result = attachmentType.validate({
        query: 'FROM logs-* | LIMIT 10',
        columns: [{ name: '@timestamp', type: 'date' }],
        sampleRows: [{ '@timestamp': '2026-04-10T00:00:00Z' }],
        totalHits: 100,
        timeRange: { from: 'now-15m', to: 'now' },
      });

      expect(result).toEqual({ valid: true, data: expect.any(Object) });
    });

    it('accepts data without timeRange', () => {
      const result = attachmentType.validate({
        query: 'FROM logs-*',
        columns: [{ name: 'status', type: 'keyword' }],
        sampleRows: [],
        totalHits: 0,
      });

      expect(result).toEqual({ valid: true, data: expect.any(Object) });
    });

    it('rejects data missing required fields', () => {
      const result = attachmentType.validate({
        query: 'FROM logs-*',
      });

      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });

    it('rejects data with wrong types', () => {
      const result = attachmentType.validate({
        query: 123,
        columns: 'not an array',
        sampleRows: [],
        totalHits: 'not a number',
      });

      expect(result).toEqual({ valid: false, error: expect.any(String) });
    });
  });

  describe('format', () => {
    const context = createFormatContext();

    it('formats query results into readable text', async () => {
      const attachment = createAttachment({
        query: 'FROM logs-* | LIMIT 10',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'status', type: 'keyword' },
        ],
        sampleRows: [
          { '@timestamp': '2026-04-10T00:00:00Z', status: 'success' },
          { '@timestamp': '2026-04-10T01:00:00Z', status: 'error' },
        ],
        totalHits: 500,
        timeRange: { from: 'now-24h', to: 'now' },
      });

      const formatted = await attachmentType.format(
        { id: attachment.id, type: attachment.type, data: attachment.data },
        context
      );

      expect(formatted.type).toBe('text');
      const text = formatted.value;

      expect(text).toContain('ES|QL Query: FROM logs-* | LIMIT 10');
      expect(text).toContain('Total Results: 500');
      expect(text).toContain('Time Range: now-24h to now');
      expect(text).toContain('@timestamp (date)');
      expect(text).toContain('status (keyword)');
      expect(text).toContain('Sample Rows (2 of 500)');
      expect(text).toContain('status: success');
      expect(text).toContain('status: error');
    });

    it('truncates long values in sample rows', async () => {
      const longValue = 'a'.repeat(150);
      const attachment = createAttachment({
        query: 'FROM logs-*',
        columns: [{ name: 'message', type: 'text' }],
        sampleRows: [{ message: longValue }],
        totalHits: 1,
      });

      const formatted = await attachmentType.format(
        { id: attachment.id, type: attachment.type, data: attachment.data },
        context
      );

      expect(formatted.type).toBe('text');
      const text = formatted.value;

      expect(text).toContain('a'.repeat(100) + '...');
      expect(text).not.toContain(longValue);
    });

    it('omits time range when not provided', async () => {
      const attachment = createAttachment({
        query: 'FROM logs-*',
        columns: [{ name: 'status', type: 'keyword' }],
        sampleRows: [],
        totalHits: 0,
      });

      const formatted = await attachmentType.format(
        { id: attachment.id, type: attachment.type, data: attachment.data },
        context
      );

      expect(formatted.type).toBe('text');
      expect(formatted.value).not.toContain('Time Range');
    });

    it('throws for invalid attachment data', () => {
      const attachment = createAttachment({ invalid: true });

      expect(() =>
        attachmentType.format(
          { id: attachment.id, type: attachment.type, data: attachment.data },
          context
        )
      ).toThrow('Invalid ES|QL query results attachment data');
    });
  });

  describe('getAgentDescription', () => {
    it('returns a description mentioning ES|QL query results', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('ES|QL query results');
      expect(description).toContain('executeEsql');
    });
  });
});
