/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DashboardState,
  DashboardUpdateIn,
  DashboardUpdateOut,
} from '../../../../server/content_management';
import { findService } from '../../../dashboard_client/find_service';
import { contentManagementService } from '../../kibana_services';
import { getDashboardContentManagementCache } from '..';
import { CONTENT_ID } from '../../../../common/content_management';

export interface UpdateDashboardMetaProps {
  id: DashboardUpdateIn['id'];
  title: DashboardState['title'];
  description?: DashboardState['description'];
  tags: string[];
}

export const updateDashboardMeta = async ({
  id,
  title,
  description = '',
  tags,
}: UpdateDashboardMetaProps) => {
  const dashboard = await findService.findById(id);
  if (dashboard.status === 'error') {
    return;
  }

  await contentManagementService.client.update<DashboardUpdateIn, DashboardUpdateOut>({
    contentTypeId: CONTENT_ID,
    id,
    data: { title, description, tags },
    options: { references: [] },
  });

  getDashboardContentManagementCache().deleteDashboard(id);
};
