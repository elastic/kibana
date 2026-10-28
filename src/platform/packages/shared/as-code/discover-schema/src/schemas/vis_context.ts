/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import {
  UnifiedHistogramSuggestionType,
  MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH,
} from '@kbn/discover-session-constants';

export const visContextSchema = lazySchema(() => z
  .object({
    suggestion_type: z
      .enum([
        UnifiedHistogramSuggestionType.lensSuggestion,
        UnifiedHistogramSuggestionType.histogramForESQL,
        UnifiedHistogramSuggestionType.histogramForDataView,
      ])
      .meta({
        description:
          'Chart suggestion type used by Discover to generate this histogram configuration.',
      }),
    attributes: z.record(z.string().max(MAX_VIS_CONTEXT_ATTRIBUTE_KEY_LENGTH), z.any()).meta({
      description: 'Lens visualization attributes used to render the Discover chart.',
    }),
  })
  .strict()
  .meta({
    description:
      'The saved chart configuration. Discover reuses it when compatible with the tab’s current settings and query results; otherwise, it rebuilds the chart.',
  }));
