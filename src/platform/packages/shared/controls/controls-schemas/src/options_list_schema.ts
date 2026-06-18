/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  MAX_OPTIONS_LIST_REQUEST_SIZE,
} from '@kbn/controls-constants';
import { controlTitleSchema, dataControlSchema } from './control_schema';

const SELECTIONS_MAX = 10000;

export const optionsListDisplaySettingsSchema = z
  .object({
    placeholder: z.string().optional().meta({
      description: 'Placeholder text displayed in the control input when no option is selected.',
    }),
    hide_action_bar: z.boolean().optional().meta({
      description:
        'When `true`, the search bar, sorting options, and select all toggle are hidden from the control.',
    }),
    hide_exclude: z.boolean().optional().meta({
      description: 'When `true`, the exclude mode toggle is hidden from the control.',
    }),
    hide_exists: z.boolean().optional().meta({
      description: 'When `true`, the exists filter option is hidden from the control.',
    }),
    hide_sort: z.boolean().optional().meta({
      description: 'When `true`, the sort selector is hidden from the control.',
    }),
  })
  .strict();

export const optionsListSearchTechniqueSchema = z
  .union([z.literal('prefix'), z.literal('wildcard'), z.literal('exact')])
  .default(DEFAULT_DSL_OPTIONS_LIST_STATE.search_technique)
  .meta({
    description:
      'The matching technique used when searching available options. `prefix` matches values starting with the search term, `wildcard` matches values containing the search term, and `exact` requires a complete match. Only applies to string and IP fields. Defaults to `wildcard`.',
  });

export const optionsListSortSchema = z
  .object({
    by: z.union([z.literal('_count'), z.literal('_key')]).meta({
      description:
        'The field used to sort the available options list. `_count` sorts by document count and `_key` sorts alphabetically by option value.',
    }),
    direction: z.union([z.literal('asc'), z.literal('desc')]).meta({
      description: 'The sort direction. `asc` sorts ascending and `desc` sorts descending.',
    }),
  })
  .strict()
  .default(DEFAULT_DSL_OPTIONS_LIST_STATE.sort)
  .meta({
    description:
      'Defines how the available options are sorted in the control popover. Defaults to `{ by: "_count", direction: "desc" }`.',
  });

export const optionsListSelectionSchema = z.union([z.string(), z.number()]).meta({
  description: 'A selected option value. Accepts a string or a number.',
});

const optionsListControlBaseParameters = z
  .object({
    display_settings: optionsListDisplaySettingsSchema.optional(),
  })
  .strict();

export const optionsListDSLControlSchema = z
  .object({
    ...optionsListControlBaseParameters.shape,
    ...dataControlSchema.shape,
    exclude: z.boolean().default(DEFAULT_DSL_OPTIONS_LIST_STATE.exclude).meta({
      description:
        'When `true`, the control filters to documents that do NOT match the selected options. Defaults to `false`.',
    }),
    exists_selected: z.boolean().default(DEFAULT_DSL_OPTIONS_LIST_STATE.exists_selected).meta({
      description:
        "When `true`, the control filters to documents where the field exists, regardless of the field's value. Defaults to `false`.",
    }),
    run_past_timeout: z.boolean().default(DEFAULT_DSL_OPTIONS_LIST_STATE.run_past_timeout).meta({
      description:
        'When `true`, the options list query continues running even if it exceeds the configured timeout threshold. Defaults to `false`.',
    }),
    search_technique: optionsListSearchTechniqueSchema,
    selected_options: z
      .array(optionsListSelectionSchema)
      .max(SELECTIONS_MAX)
      .default(DEFAULT_DSL_OPTIONS_LIST_STATE.selected_options)
      .meta({
        description: 'The list of currently selected option values.',
      }),
    single_select: z.boolean().default(DEFAULT_DSL_OPTIONS_LIST_STATE.single_select).meta({
      description:
        'When `true`, only one option can be selected at a time. Selecting a new option deselects any previously selected option. Defaults to `false`.',
    }),
    sort: optionsListSortSchema,
  })
  .strict();

const baseEsqlControlSchema = z
  .object({
    ...controlTitleSchema.shape,
    ...optionsListControlBaseParameters.shape,
    selected_options: z.array(z.string()).max(SELECTIONS_MAX).meta({
      description: 'The list of currently selected option values.',
    }),
    single_select: z.boolean().default(DEFAULT_ESQL_OPTIONS_LIST_STATE.single_select).meta({
      description:
        'When `true`, only one option can be selected at a time. Selecting a new option deselects any previously selected option. Defaults to `true`.',
    }),
    variable_name: z.string().meta({
      description:
        'The name of the ES|QL variable that this control populates. The variable is referenced in ES|QL queries using the `?variable_name` syntax.',
    }),
    variable_type: z
      .union([
        z.literal('fields'),
        z.literal('values'),
        z.literal('functions'),
        z.literal('time_literal'),
        z.literal('multi_values'),
      ])
      .meta({
        description:
          'The ES|QL variable type that determines how the selected value is substituted into the query. Accepts `fields`, `values`, `functions`, `time_literal`, or `multi_values`.',
      }),
  })
  .strict();

export const optionsListESQLControlSchema = z.discriminatedUnion('control_type', [
  baseEsqlControlSchema
    .extend({
      control_type: z.literal('STATIC_VALUES'),
      available_options: z.array(z.string()).max(MAX_OPTIONS_LIST_REQUEST_SIZE).meta({
        description: 'A fixed list of option strings displayed in the control.',
      }),
    })
    .strict()
    .meta({
      id: 'kbn-controls-schemas-options-list-esql-control-schema-static-values',
      title: 'STATIC_VALUES',
      description:
        'An ES|QL variable control with a fixed list of selectable options defined directly in `available_options`.',
    }),
  baseEsqlControlSchema
    .extend({
      control_type: z.literal('VALUES_FROM_QUERY'),
      esql_query: z.string().meta({
        description:
          'An ES|QL query whose results populate the list of available options in the control popover.',
      }),
    })
    .strict()
    .meta({
      id: 'kbn-controls-schemas-options-list-esql-control-schema-values-from-query',
      title: 'VALUES_FROM_QUERY',
      description:
        'An ES|QL variable control whose selectable options are dynamically retrieved by running an ES|QL query.',
    }),
]);
