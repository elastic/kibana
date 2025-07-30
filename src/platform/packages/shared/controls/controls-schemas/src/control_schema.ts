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

export const baseControlSchema = schema.object(
  {
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
    width: schema.maybe(controlWidthSchema),
    grow: schema.maybe(
      schema.boolean({
        defaultValue: DEFAULT_CONTROL_GROW,
        meta: { description: 'Expand width of the control panel to fit available space.' },
      })
    ),
  },
  { unknowns: 'allow' }
);

// TODO width and grow should be specified in the control, not the control state.
// This is a temporary workaround to support existing types.
// This should be removed before the public API release.
export const deprecatedDefaultControlState = schema.object(
  {
    width: schema.maybe(controlWidthSchema),
    grow: schema.maybe(schema.boolean()),
  },
  {
    meta: {
      deprecated: true,
      description: 'Width and grow should be specified in the control, not the control state',
    },
  }
);

export const dataControlState = deprecatedDefaultControlState.extends({
  dataViewId: schema.string({
    meta: { description: 'ID of the data view associated with the control.' },
  }),
  fieldName: schema.string({
    meta: { description: 'Name of the field associated with the control.' },
  }),
  title: schema.maybe(
    schema.string({
      meta: { description: 'Title of the control.' },
    })
  ),
});
