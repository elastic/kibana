/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { referenceSchema } from '@kbn/content-management-utils/zod';

const droppedPanelWarningSchema = z
  .object({
    type: z.literal('dropped_panel'),
    message: z
      .string()
      .meta({ description: 'Human-readable explanation of why the panel was dropped.' }),
    panel_type: z.string().meta({ description: 'The type identifier of the dropped panel.' }),
    panel_config: z
      .object({})
      .loose()
      .meta({ description: 'The original configuration of the dropped panel.' }),
    panel_references: z
      .array(referenceSchema)
      .max(100)
      .meta({ description: 'Saved object references used by the dropped panel.' })
      .optional(),
  })
  .meta({
    id: 'kbn-dashboard-dropped-panel-warning',
    title: 'Dropped panel',
    description:
      'A panel that was excluded from the response because its type is not supported by the API.',
  });

export const warningsSchema = z.array(droppedPanelWarningSchema).max(100).meta({
  description:
    'Panels dropped because their type is not supported by the API. Present only when one or more panels could not be returned.',
});
