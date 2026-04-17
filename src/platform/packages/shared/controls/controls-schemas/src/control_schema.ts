/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_DATA_CONTROL_STATE } from '@kbn/controls-constants';

export const controlTitleSchema = schema.object({
  title: schema.maybe(
    schema.string({ meta: { description: 'A human-readable title for the control' } })
  ),
});

export const dataControlSchema = schema.object({
  ...controlTitleSchema.getPropSchemas(),
  data_view_id: schema.string({
    meta: { description: 'The ID of the data view that the control is tied to' }, // this will generate a reference
  }),
  field_name: schema.string({
    meta: { description: 'The name of the field in the data view that the control is tied to' },
  }),
  use_global_filters: schema.boolean({
    defaultValue: DEFAULT_DATA_CONTROL_STATE.use_global_filters,
  }),
  ignore_validations: schema.boolean({
    defaultValue: DEFAULT_DATA_CONTROL_STATE.ignore_validations,
  }),
});
