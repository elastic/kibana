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
import { columnSettingsEntrySchema, documentsDisplayModeSchema, sortSchema } from './data_table';

export const discoverSessionApiEmbeddableOverridesSchema = z
  .object({
    column_order: z
      .array(z.string().meta({ description: 'Field name of a column in display order.' }))
      .max(100)
      .optional()
      .meta({
        description:
          'When set, overrides column order for the data table relative to the referenced saved object (`ref_id`) or the inline tab in `tabs`. If omitted, the source configuration is used.',
      }),
    column_settings: z.record(z.string(), columnSettingsEntrySchema).optional().meta({
      description:
        'Per-column settings keyed by field name, such as width. When set, merges with the source configuration for the referenced session or inline tab.',
    }),
    sort: z.array(sortSchema).max(100).optional().meta({
      description:
        'Sort configuration (field and direction) for the data table. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
    }),
    density: z
      .enum([DataGridDensity.COMPACT, DataGridDensity.EXPANDED, DataGridDensity.NORMAL])
      .optional()
      .meta({
        description:
          'The table row spacing. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
      }),
    header_row_height: z
      .union([z.number().min(1).max(5), z.literal('auto')])
      .optional()
      .meta({
        description:
          'The table header row height, as a number of lines, or `auto`. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
      }),
    row_height: z
      .union([z.number().min(1).max(20), z.literal('auto')])
      .optional()
      .meta({
        description:
          'The table data row height, as a number of lines, or `auto`. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the `discover:rowHeightOption` advanced setting.',
      }),
    rows_per_page: z.number().min(1).max(10000).optional().meta({
      description:
        'The number of rows per page. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the `discover:sampleRowsPerPage` advanced setting.',
    }),
    sample_size: z.number().min(10).max(10000).optional().meta({
      description:
        'The number of documents to sample. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, falls back to the source or to the `discover:sampleSize` advanced setting.',
    }),
    documents_display_mode: documentsDisplayModeSchema.meta({
      description:
        'How documents are shown: `table` for a formatted table or `json` for a raw JSON tree. When set, overrides the referenced saved object or the inline tab config in `tabs`.',
    }),
    hide_nulls: z.boolean().optional().meta({
      description:
        'When `true`, fields with null values are hidden in the JSON document view. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
    }),
    wrap_lines: z.boolean().optional().meta({
      description:
        'When `true`, long values wrap in the JSON document view. When `false`, they are truncated to a single line. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
    }),
    default_rendered_nodes: z.number().min(10).max(200).optional().meta({
      description:
        'The number of nodes each JSON cell renders by default in the JSON document view. When set, overrides the referenced saved object or the inline tab config in `tabs`. If omitted, the source configuration is used.',
    }),
  })
  .strict()
  .default({});
