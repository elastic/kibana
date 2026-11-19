/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { asCodeRelatedItemSchema } from '@kbn/as-code-shared-schemas';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { warningsSchema } from '../warnings_schema';

export const MAX_RELATED_ITEMS = 100;

export function getSanitizeResponseBodySchema() {
  return z
    .object({
      data: getDashboardStateSchema(false),
      warnings: warningsSchema.optional(),
      related_items: z.array(asCodeRelatedItemSchema).max(MAX_RELATED_ITEMS).optional().meta({
        description:
          'Related items discovered during sanitization that may need to exist in the destination space.',
      }),
      related_items_count: z.number().int().min(1).optional().meta({
        description:
          'Total number of unique related items discovered before related_items is truncated.',
      }),
    })
    .strict();
}
