/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ExaConnector } from './exa';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

const parse = <K extends keyof typeof ExaConnector.actions>(
  action: K,
  raw: Record<string, unknown>
) => ExaConnector.actions[action].input.parse(raw);

describe('ExaConnector', () => {
  const mockContext = {
    client: {},
    log: {},
    config: {
      serverUrl:
        'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa,agent_run',
    },
  } as unknown as ActionContext;

  const mockJson = { results: [{ title: 'Test', url: 'https://example.com' }] };
  const mockContent = [{ type: 'text', text: JSON.stringify(mockJson) }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockContent });
    mockListTools.mockResolvedValue({
      tools: [{ name: 'web_search_exa' }, { name: 'web_fetch_exa' }],
    });
  });

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  describe('metadata', () => {
    it('has the expected id', () => {
      expect(ExaConnector.metadata.id).toBe('.exa');
    });

    it('ships with only agentBuilder in supportedFeatureIds (two-step release)', () => {
      expect(ExaConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('has enterprise minimumLicense', () => {
      expect(ExaConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('has test.enabled = true', () => {
      expect(ExaConnector.test.enabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // exaSearch
  // ---------------------------------------------------------------------------

  describe('exaSearch action', () => {
    it('forwards the query with the default numResults', async () => {
      const input = parse('exaSearch', { query: 'Elastic observability stack' });
      await ExaConnector.actions.exaSearch.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_exa',
        arguments: { query: 'Elastic observability stack', numResults: 10 },
      });
    });

    it('forwards a custom numResults', async () => {
      const input = parse('exaSearch', {
        query: 'kibana lens tutorial',
        numResults: 5,
      });
      await ExaConnector.actions.exaSearch.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_exa',
        arguments: { query: 'kibana lens tutorial', numResults: 5 },
      });
    });

    it('rejects an empty query', () => {
      expect(() => parse('exaSearch', { query: '' })).toThrow();
    });

    it('rejects numResults out of range', () => {
      expect(() => parse('exaSearch', { query: 'test', numResults: 101 })).toThrow();
      expect(() => parse('exaSearch', { query: 'test', numResults: 0 })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // exaFetch
  // ---------------------------------------------------------------------------

  describe('exaFetch action', () => {
    it('forwards urls with the default maxCharacters', async () => {
      const input = parse('exaFetch', { urls: ['https://example.com/page'] });
      await ExaConnector.actions.exaFetch.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_fetch_exa',
        arguments: { urls: ['https://example.com/page'], maxCharacters: 3000 },
      });
    });

    it('forwards multiple urls and a custom maxCharacters', async () => {
      const input = parse('exaFetch', {
        urls: ['https://a.com', 'https://b.com'],
        maxCharacters: 5000,
      });
      await ExaConnector.actions.exaFetch.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_fetch_exa',
        arguments: {
          urls: ['https://a.com', 'https://b.com'],
          maxCharacters: 5000,
        },
      });
    });

    it('rejects an empty urls array', () => {
      expect(() => parse('exaFetch', { urls: [] })).toThrow();
    });

    it('rejects more than 25 urls', () => {
      const tooMany = Array.from({ length: 26 }, (_, i) => `https://example.com/${i}`);
      expect(() => parse('exaFetch', { urls: tooMany })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // exaSearchAdvanced
  // ---------------------------------------------------------------------------

  describe('exaSearchAdvanced action', () => {
    it('forwards a minimal query without optional fields', async () => {
      const input = parse('exaSearchAdvanced', { query: 'observability trends 2026' });
      await ExaConnector.actions.exaSearchAdvanced.handler(mockContext, input);

      // Only query and numResults (defaulted) should be present; no undefined keys
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_advanced_exa',
        arguments: { query: 'observability trends 2026', numResults: 10 },
      });
    });

    it('forwards domain include/exclude and date filters', async () => {
      const input = parse('exaSearchAdvanced', {
        query: 'machine learning papers',
        includeDomains: ['arxiv.org', 'papers.nips.cc'],
        excludeDomains: ['reddit.com'],
        startPublishedDate: '2026-01-01',
        endPublishedDate: '2026-06-30',
        numResults: 20,
        category: 'pdf',
      });
      await ExaConnector.actions.exaSearchAdvanced.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_advanced_exa',
        arguments: expect.objectContaining({
          query: 'machine learning papers',
          includeDomains: ['arxiv.org', 'papers.nips.cc'],
          excludeDomains: ['reddit.com'],
          startPublishedDate: '2026-01-01',
          endPublishedDate: '2026-06-30',
          numResults: 20,
          category: 'pdf',
        }),
      });
    });

    it('does not include undefined optional fields in the tool call', async () => {
      const input = parse('exaSearchAdvanced', { query: 'test' });
      await ExaConnector.actions.exaSearchAdvanced.handler(mockContext, input);

      const calledArgs = mockCallTool.mock.calls[0][0].arguments;
      // Keys with undefined values must not be forwarded to the MCP tool
      expect(Object.keys(calledArgs)).not.toContain('category');
      expect(Object.keys(calledArgs)).not.toContain('includeDomains');
      expect(Object.keys(calledArgs)).not.toContain('startPublishedDate');
    });

    it('rejects an invalid userLocation (not a 2-letter code)', () => {
      expect(() => parse('exaSearchAdvanced', { query: 'test', userLocation: 'USA' })).toThrow();
    });

    it('rejects more than 50 includeDomains', () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => `domain${i}.com`);
      expect(() =>
        parse('exaSearchAdvanced', { query: 'test', includeDomains: tooMany })
      ).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // exaAgentRun
  // ---------------------------------------------------------------------------

  describe('exaAgentRun action', () => {
    it('forwards a new query with defaults', async () => {
      const input = parse('exaAgentRun', {
        query: 'list AI ops vendors founded after 2022',
      });
      await ExaConnector.actions.exaAgentRun.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'agent_run',
        arguments: { query: 'list AI ops vendors founded after 2022' },
      });
    });

    it('forwards a runId (resume existing run)', async () => {
      const input = parse('exaAgentRun', { runId: 'agent_run_abc123' });
      await ExaConnector.actions.exaAgentRun.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'agent_run',
        arguments: { runId: 'agent_run_abc123' },
      });
    });

    it('forwards optional fields when provided', async () => {
      const input = parse('exaAgentRun', {
        query: 'research question',
        effort: 'medium',
        systemPrompt: 'Be concise.',
        previousRunId: 'agent_run_prev',
      });
      await ExaConnector.actions.exaAgentRun.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'agent_run',
        arguments: {
          query: 'research question',
          effort: 'medium',
          systemPrompt: 'Be concise.',
          previousRunId: 'agent_run_prev',
        },
      });
    });

    it('rejects when both query and runId are provided', () => {
      expect(() =>
        parse('exaAgentRun', {
          query: 'some query',
          runId: 'agent_run_abc',
        })
      ).toThrow();
    });

    it('rejects when neither query nor runId are provided', () => {
      expect(() => parse('exaAgentRun', {})).toThrow();
    });

    it('rejects a runId that does not start with agent_run_', () => {
      expect(() => parse('exaAgentRun', { runId: 'run_abc123' })).toThrow();
    });

    it('rejects an invalid effort value', () => {
      expect(() => parse('exaAgentRun', { query: 'test', effort: 'extreme' })).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // listTools
  // ---------------------------------------------------------------------------

  describe('listTools action', () => {
    it('returns the list of available tools from the MCP server', async () => {
      const result = await ExaConnector.actions.listTools.handler(mockContext, {});

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'web_search_exa' }, { name: 'web_fetch_exa' }]);
    });
  });

  // ---------------------------------------------------------------------------
  // callTool
  // ---------------------------------------------------------------------------

  describe('callTool action', () => {
    it('calls the named tool and forwards arguments', async () => {
      const result = await ExaConnector.actions.callTool.handler(mockContext, {
        name: 'web_search_exa',
        arguments: { query: 'elastic stack' },
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_exa',
        arguments: { query: 'elastic stack' },
      });
      expect(result).toEqual(mockContent);
    });

    it('calls the named tool with no arguments when omitted', async () => {
      await ExaConnector.actions.callTool.handler(mockContext, { name: 'web_search_exa' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'web_search_exa',
        arguments: {},
      });
    });
  });

  // ---------------------------------------------------------------------------
  // test handler
  // ---------------------------------------------------------------------------

  describe('test handler', () => {
    const testSpec = ExaConnector.test;

    it('returns empty object on successful connection', async () => {
      const result = await testSpec.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));

      await expect(testSpec.handler(mockContext)).rejects.toThrow('connection refused');
    });
  });
});
