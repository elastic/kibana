/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeleteIn, DeleteResult } from '@kbn/content-management-plugin/common';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { getDashboardContentManagementCache } from '..';
import { contentManagementService } from '../../kibana_services';

export const deleteDashboards = async (ids: string[]) => {
  const deletePromises = ids.map((id) => {
    getDashboardContentManagementCache().deleteDashboard(id);
    return contentManagementService.client.delete<DeleteIn, DeleteResult>({
      contentTypeId: DASHBOARD_CONTENT_ID,
      id,
    });
  });

  await Promise.all(deletePromises);
};
