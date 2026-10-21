/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DataGridDensity } from '@kbn/discover-session-constants';

export const columnSettingsEntrySchema = z
  .object({
    width: z.number().min(0).optional().meta({
      description: 'Optional width of the column in pixels.',
    }),
  })
  .strict();

export const sortSchema = z
  .object({
    name: z.string().meta({
      description: 'The name of the field to sort by.',
    }),
    direction: z.enum(['asc', 'desc']).meta({
      description: 'The sort direction: `asc` for ascending or `desc` for descending.',
    }),
  })
  .strict();

export const documentsDisplayModeSchema = z.enum(['table', 'json']).optional();

export const dataTableLimitsSchema = z
  .object({
    rows_per_page: z.number().min(1).max(10000).optional().meta({
      description:
        'The number of rows to display per page in the data table. If omitted, defaults to the `discover:sampleRowsPerPage` advanced setting. Has no effect on ES|QL tabs.',
    }),
    sample_size: z.number().min(10).max(10000).optional().meta({
      description:
        'The number of documents to sample for the data table. If omitted, defaults to the `discover:sampleSize` advanced setting.',
    }),
  })
  .strict()
  .meta({ id: 'discoverSessionEmbeddableDataTableLimitsSchema' });

export const dataTableSchema = z
  .object({
    column_order: z
      .array(z.string().meta({ description: 'Field name of a column in display order.' }))
      .max(100)
      .optional()
      .meta({
        description:
          'Ordered list of field names to display in the data table. If omitted, defaults to the `defaultColumns` advanced setting.',
      }),
    column_settings: z.record(z.string(), columnSettingsEntrySchema).optional().meta({
      description:
        'Per-column settings keyed by field name, such as width. Keys should correspond to entries in `column_order` when both are set.',
    }),
    sort: z.array(sortSchema).max(100).default([]).meta({
      description: 'Sort configuration for the data table (field and direction).',
    }),
    density: z
      .enum([DataGridDensity.COMPACT, DataGridDensity.EXPANDED, DataGridDensity.NORMAL])
      .optional()
      .meta({
        description:
          'The table row spacing. If omitted, Kibana determines the density from its current settings, such as the user preference.',
      }),
    header_row_height: z
      .union([z.number().min(1).max(5), z.literal('auto')])
      .optional()
      .meta({
        description:
          'The table header row height, as a number of lines, or `auto` to size it based on content. If omitted, Kibana determines the height from its current settings, such as the user preference.',
      }),
    row_height: z
      .union([z.number().min(1).max(20), z.literal('auto')])
      .optional()
      .meta({
        description:
          'The table data row height, as a number of lines, or `auto` to size it based on content. If omitted, defaults to the `discover:rowHeightOption` advanced setting.',
      }),
    documents_display_mode: documentsDisplayModeSchema.meta({
      description:
        'How documents are shown: `table` for a formatted table or `json` for a raw JSON tree.',
    }),
    hide_nulls: z.boolean().optional().meta({
      description: 'When `true`, fields with null values are hidden in the JSON document view.',
    }),
    wrap_lines: z.boolean().optional().meta({
      description:
        'When `true`, long values wrap in the JSON document view. When `false`, they are truncated to a single line.',
    }),
    default_rendered_nodes: z.number().min(10).max(200).optional().meta({
      description:
        'The number of nodes each JSON cell renders by default in the JSON document view.',
    }),
  })
  .strict()
  .meta({ id: 'discoverSessionEmbeddableDataTableSchema' });
