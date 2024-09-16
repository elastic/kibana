/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import {
  controlGroupInputSchema as controlGroupInputSchemaV1,
  dashboardAttributesSchema as dashboardAttributesSchemaV1,
} from '../v1';

export const dashboardAttributesSchema = dashboardAttributesSchemaV1.extends(
  {
    controlGroupInput: schema.maybe(
      controlGroupInputSchemaV1.extends(
        {
          showApplySelections: schema.maybe(schema.boolean()),
        },
        { unknowns: 'ignore' }
      )
    ),
  },
  { unknowns: 'ignore' }
);

export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
