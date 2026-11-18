/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ApiBodyEntry } from '@kbn/saved-objects-management-plugin/server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { getDashboardStateSchema } from './dashboard_state_schemas';
import { stripUnmappedKeys } from './scope_tooling';
import { transformDashboardIn, transformDashboardOut } from './transforms';

/** Creates the `dashboard` entry for Saved Objects Management's API body registry. */
export const createDashboardApiBodyEntry = (): ApiBodyEntry<
  DashboardState,
  DashboardSavedObjectAttributes
> => {
  // Built on first use: embeddable panel schemas are complete only after every plugin's setup.
  const getSchema = once(() => getDashboardStateSchema(false));

  return {
    getSchema,
    toApi: ({ attributes, references }) => {
      const { dashboardState, warnings } = transformDashboardOut(
        attributes,
        references,
        false,
        getSchema()
      );
      // Same as the public GET: panels the API can't represent are dropped and reported.
      const { data, warnings: scopeWarnings } = stripUnmappedKeys(dashboardState);
      return { body: data, warnings: [...warnings, ...scopeWarnings] };
    },
    // Access control isn't an attribute: the update route applies it separately, and import leaves it to core.
    toStored: ({ access_control: _accessControl, ...body }) => transformDashboardIn(body),
  };
};
