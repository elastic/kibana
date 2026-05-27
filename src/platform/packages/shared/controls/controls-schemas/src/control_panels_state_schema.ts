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
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
  EsqlControlType,
  MAX_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { controlWidthSchema } from './controls_group_schema';
import { baseEsqlControlProps, optionsListDSLControlSchema } from './options_list_schema';
import { rangeSliderControlSchema } from './range_slider_schema';
import { timeSliderControlSchema } from './time_slider_schema';

const controlPanelLayoutSchema = {
  id: schema.maybe(schema.string({ meta: { description: 'The unique ID of the control panel.' } })),
  order: schema.number({
    meta: { description: 'Display order of the control panel within the control group.' },
  }),
  width: controlWidthSchema,
  grow: schema.boolean({
    defaultValue: DEFAULT_PINNED_CONTROL_STATE.grow,
    meta: {
      description:
        'When `true`, the control expands to fill any available horizontal space. Defaults to `false`.',
    },
  }),
};

const esqlControlPanelStaticValuesSchema = schema.object({
  type: schema.literal(ESQL_CONTROL),
  ...controlPanelLayoutSchema,
  ...baseEsqlControlProps,
  control_type: schema.literal(EsqlControlType.STATIC_VALUES),
  available_options: schema.arrayOf(schema.string(), {
    maxSize: MAX_OPTIONS_LIST_REQUEST_SIZE,
    meta: {
      description: 'A fixed list of option strings displayed in the control.',
    },
  }),
});

const esqlControlPanelValuesFromQuerySchema = schema.object({
  type: schema.literal(ESQL_CONTROL),
  ...controlPanelLayoutSchema,
  ...baseEsqlControlProps,
  control_type: schema.literal(EsqlControlType.VALUES_FROM_QUERY),
  esql_query: schema.string({
    meta: {
      description:
        'An ES|QL query whose results populate the list of available options in the control popover.',
    },
  }),
});

const esqlControlPanelVariantSchema = schema.discriminatedUnion('control_type', [
  esqlControlPanelStaticValuesSchema,
  esqlControlPanelValuesFromQuerySchema,
]);

const esqlControlPanelSchema = schema.object(
  {
    type: schema.literal(ESQL_CONTROL),
    ...controlPanelLayoutSchema,
    ...baseEsqlControlProps,
    control_type: schema.oneOf([
      schema.literal(EsqlControlType.STATIC_VALUES),
      schema.literal(EsqlControlType.VALUES_FROM_QUERY),
    ]),
    available_options: schema.maybe(
      schema.arrayOf(schema.string(), {
        maxSize: MAX_OPTIONS_LIST_REQUEST_SIZE,
        meta: {
          description: 'A fixed list of option strings displayed in the control.',
        },
      })
    ),
    esql_query: schema.maybe(
      schema.string({
        meta: {
          description:
            'An ES|QL query whose results populate the list of available options in the control popover.',
        },
      })
    ),
  },
  {
    validate: (value) => {
      try {
        esqlControlPanelVariantSchema.validate(value);
      } catch (error) {
        return error instanceof Error ? error.message : 'Invalid ES|QL control panel state';
      }
    },
    meta: {
      id: 'kbn-controls-schemas-control-panels-state-esql-control',
      title: ESQL_CONTROL,
      description:
        'An ES|QL variable control whose selected value is injected into ES|QL queries using the `?variable_name` syntax.',
    },
  }
);

const optionsListControlPanelSchema = schema.object({
  type: schema.literal(OPTIONS_LIST_CONTROL),
  ...controlPanelLayoutSchema,
  ...optionsListDSLControlSchema.getPropSchemas(),
});

const rangeSliderControlPanelSchema = schema.object({
  type: schema.literal(RANGE_SLIDER_CONTROL),
  ...controlPanelLayoutSchema,
  ...rangeSliderControlSchema.getPropSchemas(),
});

const timeSliderControlPanelSchema = schema.object({
  type: schema.literal(TIME_SLIDER_CONTROL),
  ...controlPanelLayoutSchema,
  ...timeSliderControlSchema.getPropSchemas(),
});

const controlPanelStateSchema = schema.discriminatedUnion('type', [
  esqlControlPanelSchema,
  optionsListControlPanelSchema,
  rangeSliderControlPanelSchema,
  timeSliderControlPanelSchema,
]);

/**
 * Schema for the flattened `ControlPanelsState` map shape used by the control group renderer.
 * Unlike {@link getControlsGroupSchema}, panel config is flattened at the top level of each entry.
 */
export const controlPanelsStateSchema = schema.recordOf(
  schema.string({
    meta: { description: 'The unique ID of the control panel.' },
  }),
  controlPanelStateSchema,
  {
    defaultValue: {},
    meta: {
      id: 'kbn-controls-schemas-control-panels-state',
      description:
        'Control panels keyed by panel ID. Each value describes one control and its layout within the group.',
    },
  }
);
