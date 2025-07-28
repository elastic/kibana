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
  CONTROLS_CHAINING_HIERARCHICAL,
  CONTROLS_CHAINING_NONE,
  CONTROLS_LABEL_POSITION_ONE_LINE,
  CONTROLS_LABEL_POSITION_TWO_LINE,
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROLS_CHAINING,
  DEFAULT_CONTROLS_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '@kbn/controls-constants';
import { controlSchema } from './control_schema';

export const labelPositionSchema = schema.oneOf(
  [
    schema.literal(CONTROLS_LABEL_POSITION_ONE_LINE),
    schema.literal(CONTROLS_LABEL_POSITION_TWO_LINE),
  ],
  {
    defaultValue: DEFAULT_CONTROLS_LABEL_POSITION,
    meta: {
      description: 'Position of the labels for controls. For example, "oneLine", "twoLine".',
    },
  }
);

export const chainingSchema = schema.oneOf(
  [schema.literal(CONTROLS_CHAINING_HIERARCHICAL), schema.literal(CONTROLS_CHAINING_NONE)],
  {
    defaultValue: DEFAULT_CONTROLS_CHAINING,
    meta: {
      description:
        'The chaining strategy for multiple controls. For example, "HIERARCHICAL" or "NONE".',
    },
  }
);

export const ignoreParentSettingsSchema = schema.object({
  ignoreFilters: schema.boolean({
    meta: { description: 'Ignore global filters in controls.' },
    defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreFilters,
  }),
  ignoreQuery: schema.boolean({
    meta: { description: 'Ignore the global query bar in controls.' },
    defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreQuery,
  }),
  ignoreTimerange: schema.boolean({
    meta: { description: 'Ignore the global time range in controls.' },
    defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreTimerange,
  }),
  ignoreValidations: schema.boolean({
    meta: { description: 'Ignore validations in controls.' },
    defaultValue: DEFAULT_IGNORE_PARENT_SETTINGS.ignoreValidations,
  }),
});

export const controlsGroupSchema = schema.object({
  controls: schema.arrayOf(controlSchema, {
    defaultValue: [],
    meta: { description: 'An array of control panels and their state in the control group.' },
  }),
  labelPosition: labelPositionSchema,
  chainingSystem: chainingSchema,
  enhancements: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  ignoreParentSettings: ignoreParentSettingsSchema,
  autoApplySelections: schema.boolean({
    meta: { description: 'Show apply selections button in controls.' },
    defaultValue: DEFAULT_AUTO_APPLY_SELECTIONS,
  }),
});
