/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DashboardDrilldown, StoredDashboardDrilldown } from './types';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';

export function transformIn(state: DashboardDrilldown): {
  state: StoredDashboardDrilldown;
  references?: Reference[];
} {
  const { dashboard_id, ...rest } = state;
  const dashboardRef = {
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    // Using dashboard id to avoid
    name: `dashboard_drilldown_${dashboard_id}`,
    id: dashboard_id,
  };
  return {
    state: {
      ...rest,
      dashboardRefName: dashboardRef.name,
    },
    references: [dashboardRef],
  };
}

export function transformOut(
  storedState: StoredDashboardDrilldown,
  references?: Reference[]
): DashboardDrilldown {
  const { dashboardRefName, ...rest } = storedState;
  const reference = references?.find(({ name }) => name === dashboardRefName);
  return {
    ...rest,
    dashboard_id: reference?.id ?? '',
  };
}
