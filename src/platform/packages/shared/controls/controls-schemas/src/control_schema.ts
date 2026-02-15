/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_IGNORE_VALIDATIONS, DEFAULT_USE_GLOBAL_FILTERS } from '@kbn/controls-constants';

export const controlSchema = schema.object(
  {
    title: schema.maybe(
      schema.string({ meta: { description: 'A human-readable title for the control' } })
    ),
    description: schema.maybe(
      schema.string({ meta: { description: 'A description for the control' } })
    ),
  },
  { unknowns: 'allow' }
);

export const dataControlSchema = controlSchema.extends({
  data_view_id: schema.string({
    meta: { description: 'The ID of the data view that the control is tied to' }, // this will generate a reference
  }),
  field_name: schema.string({
    meta: { description: 'The name of the field in the data view that the control is tied to' },
  }),
  use_global_filters: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_USE_GLOBAL_FILTERS,
    })
  ),
  ignore_validations: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_IGNORE_VALIDATIONS,
    })
  ),
});
