/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardSanitizeResponseBody, DashboardState, LinksState } from '../../server';
import { DASHBOARD_INTERNAL_API_PATH } from '../../common/constants';
import { coreServices } from '../services/kibana_services';

export async function sanitizeLinks(state: LinksState) {
  const result = await coreServices.http.post<DashboardSanitizeResponseBody>(
    `/api/links/_sanitize`,
    {
      version: '1',
      body: JSON.stringify(state),
    }
  );

  return {
    data: result.data,
    warnings: result.warnings ?? [],
  };
}
