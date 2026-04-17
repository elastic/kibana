/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { referenceSchema } from '@kbn/content-management-utils';

const droppedPanelWarningSchema = schema.object(
  {
    type: schema.literal('dropped_panel'),
    message: schema.string(),
    panel_type: schema.string(),
    panel_config: schema.object(
      {},
      {
        unknowns: 'allow',
      }
    ),
    panel_references: schema.maybe(
      schema.arrayOf(referenceSchema, {
        maxSize: 100,
      })
    ),
  },
  {
    meta: {
      id: 'kbn-dashboard-dropped-panel-warning',
    },
  }
);

export const warningsSchema = schema.arrayOf(droppedPanelWarningSchema, {
  maxSize: 100,
});
