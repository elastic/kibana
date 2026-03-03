/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils/src/types';
import type { DrilldownState } from '../../server';

export function transformDashboardDrilldown(
  urlState: DrilldownState & { dashboardRefName?: string },
  references?: Reference[]
) {
  if (!urlState.dashboardRefName) {
    return urlState;
  }

  const { dashboardRefName, ...rest } = urlState;
  const reference = references?.find(({ name }) => name === dashboardRefName);
  return {
    ...rest,
    dashboard_id: reference?.id ?? '',
  };
}
