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
      .optional()
      .meta({ description: 'Saved object references used by the dropped panel.' }),
  })
  .strict()
  .meta({
    id: 'kbn-dashboard-dropped-panel-warning',
    title: 'Dropped panel',
    description:
      'A panel that was excluded from the response because its type is not supported by the API.',
  });

const droppedDashboardProperty = z
  .object({
    type: z.literal('dropped_property'),
    message: z
      .string()
      .meta({ description: 'Human-readable explanation of why the property was dropped.' }),
    key: z.string().meta({ description: 'The name of the property that was dropped.' }),
    value: z
      .any()
      .optional()
      .meta({ description: 'The original value of the property that was dropped.' }),
  })
  .strict()
  .meta({
    id: 'kbn-dashboard-dropped-property-warning',
    title: 'Dropped property',
    description: 'A property that was excluded from the response because it failed validation.',
  });

export const warningsSchema = z
  .array(z.union([droppedPanelWarningSchema, droppedDashboardProperty]))
  .max(100)
  .meta({
    description:
      'A list of warnings returned by the Dashboards API. Present only when one or more dashboard properties failed validation.',
  });
