/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { DISCOVER_SESSION_ATTACHMENT_TYPE } from '../../common/agent_builder';
import {
  discoverSessionApiDataSchema,
  MAX_SESSION_TITLE_LENGTH,
  MAX_TAB_LABEL_LENGTH,
  type DiscoverSessionApiData,
} from '../api/schema';

const MAX_ESQL_LENGTH = 4096;
const MAX_TIME_RANGE_BOUND_LENGTH = 128;
const MAX_COLUMN_NAME_LENGTH = 1024;
const MAX_COLUMNS = 100;
const SESSION_TAB_ID = 'main';

const createDiscoverSessionSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(MAX_SESSION_TITLE_LENGTH)
    .describe('Title for the Discover session shown in chat and when opening in Discover.'),
  esql: z
    .string()
    .min(1)
    .max(MAX_ESQL_LENGTH)
    .describe(
      'An ES|QL query that returns documents (not aggregations). Only pass queries from generateEsql, executeEsql, or the user — never invent ES|QL.'
    ),
  time_range: z
    .object({
      from: z.string().min(1).max(MAX_TIME_RANGE_BOUND_LENGTH),
      to: z.string().min(1).max(MAX_TIME_RANGE_BOUND_LENGTH),
    })
    .optional()
    .describe('Optional time range for the session table (for example now-24h to now).'),
  columns: z
    .array(z.string().min(1).max(MAX_COLUMN_NAME_LENGTH))
    .max(MAX_COLUMNS)
    .optional()
    .describe('Optional field names to show as table columns, in display order.'),
});

const truncateTabLabel = (title: string): string =>
  title.length > MAX_TAB_LABEL_LENGTH ? title.slice(0, MAX_TAB_LABEL_LENGTH) : title;

const buildDiscoverSessionToolData = ({
  title,
  esql,
  time_range: timeRange,
  columns,
}: z.infer<typeof createDiscoverSessionSchema>): DiscoverSessionApiData | { error: string } => {
  const tab: Record<string, unknown> = {
    id: SESSION_TAB_ID,
    label: truncateTabLabel(title),
    data_source: {
      type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
      query: esql,
    },
    hide_chart: true,
    hide_table: false,
  };

  if (timeRange) {
    tab.time_restore = true;
    tab.time_range = timeRange;
  }

  if (columns && columns.length > 0) {
    tab.column_order = columns;
  }

  const parseResult = discoverSessionApiDataSchema.safeParse({
    title,
    tabs: [tab],
  });

  if (!parseResult.success) {
    return { error: parseResult.error.message };
  }

  return parseResult.data;
};

export const createDiscoverSessionTool = (): BuiltinToolDefinition<
  typeof createDiscoverSessionSchema
> => {
  return {
    id: platformCoreTools.createDiscoverSession,
    type: ToolType.builtin,
    description: `Create a Discover session attachment that shows a live document table in chat. Use this when the user should see raw documents or rows, not a chart.

Pass an ES|QL query that returns documents (FROM or TS with WHERE/LIMIT as needed). Do not invent ES|QL — only use a query from generateEsql, executeEsql, or the user. Do not use this for aggregations (STATS) or charts; use ${platformCoreTools.createVisualization} instead.

This tool does not execute the query. It stores a by-value Discover session (one tab, chart hidden) and returns attachment_id, version, and esql. After a successful call, render it with <render_attachment> using that attachment_id. Do not paste rows, tab JSON, or vis_context into the conversation.`,
    schema: createDiscoverSessionSchema,
    tags: [],
    annotations: {
      title: 'Create Discover session',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async ({ title, esql, time_range: timeRange, columns }, { attachments, logger }) => {
      const sessionData = buildDiscoverSessionToolData({
        title,
        esql,
        time_range: timeRange,
        columns,
      });

      if ('error' in sessionData) {
        logger.error(`Invalid Discover session data: ${sessionData.error}`);
        return {
          results: [createErrorResult(`Failed to create Discover session: ${sessionData.error}`)],
        };
      }

      try {
        const attachment = await attachments.add({
          type: DISCOVER_SESSION_ATTACHMENT_TYPE,
          data: sessionData,
          description: `Discover session: ${title}`,
        });

        return {
          results: [
            createOtherResult({
              attachment_id: attachment.id,
              version: attachment.current_version,
              esql,
            }),
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to persist Discover session attachment: ${message}`);
        return {
          results: [createErrorResult(`Failed to save Discover session: ${message}`)],
        };
      }
    },
  };
};
