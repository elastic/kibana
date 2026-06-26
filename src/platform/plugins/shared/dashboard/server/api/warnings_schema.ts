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
    message: schema.string({
      meta: { description: 'Human-readable explanation of why the panel was dropped.' },
    }),
    panel_type: schema.string({
      meta: { description: 'The type identifier of the dropped panel.' },
    }),
    panel_config: schema.object(
      {},
      {
        unknowns: 'allow',
        meta: { description: 'The original configuration of the dropped panel.' },
      }
    ),
    panel_references: schema.maybe(
      schema.arrayOf(referenceSchema, {
        maxSize: 100,
        meta: { description: 'Saved object references used by the dropped panel.' },
      })
    ),
  },
  {
    meta: {
      id: 'kbn-dashboard-dropped-panel-warning',
      title: 'Dropped panel',
      description:
        'A panel that was excluded from the response because its type is not supported by the API.',
    },
  }
);

const droppedDashboardProperty = schema.object(
  {
    type: schema.literal('dropped_property'),
    message: schema.string({
      meta: { description: 'Human-readable explanation of why the property was dropped.' },
    }),
    key: schema.string({
      meta: { description: 'The name of the property that was dropped.' },
    }),
    value: schema.maybe(
      schema.any({
        meta: { description: 'The original value of the property that was dropped.' },
      })
    ),
  },
  {
    meta: {
      id: 'kbn-dashboard-dropped-property-warning',
      title: 'Dropped panel',
      description:
        'A panel that was excluded from the response because its type is not supported by the API.',
    },
  }
);

export const warningsSchema = schema.arrayOf(
  schema.oneOf([droppedPanelWarningSchema, droppedDashboardProperty]),
  {
    maxSize: 100,
    meta: {
      description:
        'A list of warnings returned by the Dashboards API. Present only when one or more dashboard properties failed validation.',
    },
  }
);
