/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import { baseControlSchema, dataControlState } from './control_schema';

export const optionsListControlState = dataControlState.extends({
  searchTechnique: schema.maybe(
    schema.oneOf([schema.literal('prefix'), schema.literal('wildcard'), schema.literal('exact')], {
      meta: { description: 'Search technique used for suggestions.' },
    })
  ),
  sort: schema.maybe(
    schema.object({
      by: schema.oneOf([schema.literal('_count'), schema.literal('_key')], {
        meta: { description: 'Sort by field for suggestions.' },
      }),
      direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
        meta: { description: 'Sort direction for suggestions.' },
      }),
    })
  ),
  selectedOptions: schema.maybe(
    schema.arrayOf(schema.oneOf([schema.string(), schema.number()]), {
      meta: { description: 'The currently selected options.' },
    })
  ),
  existsSelected: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the "exists" option is selected.' },
    })
  ),
  runPastTimeout: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether to run past the timeout for suggestions.' },
    })
  ),
  singleSelect: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the control allows single selection.' },
    })
  ),
  exclude: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether to exclude selected options from suggestions.' },
    })
  ),
});

export const optionsListControl = baseControlSchema.extends({
  type: schema.literal(OPTIONS_LIST_CONTROL),
  controlConfig: optionsListControlState,
});
