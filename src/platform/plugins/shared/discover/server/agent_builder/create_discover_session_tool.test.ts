/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { DISCOVER_SESSION_ATTACHMENT_TYPE } from '../../common/agent_builder';
import { MAX_SESSION_TITLE_LENGTH } from '../api/schema';
import { createDiscoverSessionTool } from './create_discover_session_tool';

const ESQL = 'FROM logs-* | WHERE status >= 500 | LIMIT 100';

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

const createAttachments = () => ({
  add: jest.fn().mockResolvedValue({ id: 'att-session', current_version: 1 }),
});

const runHandler = async (
  params: Record<string, unknown>,
  overrides: { logger?: Logger; attachments?: ReturnType<typeof createAttachments> } = {}
) => {
  const logger = overrides.logger ?? createLogger();
  const attachments = overrides.attachments ?? createAttachments();
  const tool = createDiscoverSessionTool();
  const result = (await tool.handler(
    params as never,
    {
      logger,
      attachments: attachments as never,
    } as never
  )) as { results: Array<{ type: string; data: Record<string, unknown> }> };
  return { result, logger, attachments };
};

describe('createDiscoverSessionTool schema', () => {
  const schema = createDiscoverSessionTool().schema;

  it('accepts title and esql', () => {
    expect(schema.safeParse({ title: 'Nginx errors', esql: ESQL }).success).toBe(true);
  });

  it('rejects a missing esql query', () => {
    expect(schema.safeParse({ title: 'Nginx errors' }).success).toBe(false);
  });

  it('rejects an over-long title', () => {
    expect(
      schema.safeParse({
        title: 'a'.repeat(MAX_SESSION_TITLE_LENGTH + 1),
        esql: ESQL,
      }).success
    ).toBe(false);
  });
});

describe('createDiscoverSessionTool', () => {
  it('uses the platform.core.create_discover_session id', () => {
    expect(createDiscoverSessionTool().id).toBe(platformCoreTools.createDiscoverSession);
  });

  it('persists a one-tab ES|QL session with the chart hidden', async () => {
    const { result, attachments } = await runHandler({
      title: 'Nginx errors',
      esql: ESQL,
      time_range: { from: 'now-24h', to: 'now' },
      columns: ['@timestamp', 'message'],
    });

    expect(attachments.add).toHaveBeenCalledWith({
      type: DISCOVER_SESSION_ATTACHMENT_TYPE,
      description: 'Discover session: Nginx errors',
      data: expect.objectContaining({
        title: 'Nginx errors',
        tabs: [
          expect.objectContaining({
            id: 'main',
            hide_chart: true,
            time_restore: true,
            time_range: { from: 'now-24h', to: 'now' },
            column_order: ['@timestamp', 'message'],
            data_source: {
              type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
              query: ESQL,
            },
          }),
        ],
      }),
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(result.results[0].data).toEqual({
      attachment_id: 'att-session',
      version: 1,
      esql: ESQL,
    });
    expect(result.results[0].data).not.toHaveProperty('tabs');
  });

  it('returns an error when attachment persistence fails', async () => {
    const attachments = createAttachments();
    attachments.add.mockRejectedValue(new Error('quota exceeded'));

    const { result } = await runHandler({ title: 'Nginx errors', esql: ESQL }, { attachments });

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('quota exceeded');
  });
});
