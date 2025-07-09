/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-constants';

export const controlWidthSchema = schema.oneOf(
  [
    schema.literal(CONTROL_WIDTH_SMALL),
    schema.literal(CONTROL_WIDTH_MEDIUM),
    schema.literal(CONTROL_WIDTH_LARGE),
  ],
  {
    defaultValue: DEFAULT_CONTROL_WIDTH,
    meta: { description: 'Minimum width of the control panel in the control group.' },
  }
);

export const controlSchema = schema.object(
  {
    type: schema.string({ meta: { description: 'The type of the control panel.' } }),
    controlConfig: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    id: schema.maybe(
      schema.string({
        meta: { description: 'The unique ID of the control.' },
      })
    ),
    order: schema.number({
      meta: {
        description: 'The order of the control panel in the control group.',
      },
    }),
    width: controlWidthSchema,
    grow: schema.boolean({
      defaultValue: DEFAULT_CONTROL_GROW,
      meta: { description: 'Expand width of the control panel to fit available space.' },
    }),
  },
  { unknowns: 'allow' }
);
