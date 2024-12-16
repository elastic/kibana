/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardContainerInput } from '../../../../common';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import type { DashboardUpdateIn, DashboardUpdateOut } from '../../../../server/content_management';
import { findDashboardsByIds } from './find_dashboards';
import { contentManagementService, savedObjectsTaggingService } from '../../kibana_services';

type UpdateDashboardMetaProps = Pick<
  DashboardContainerInput,
  'id' | 'title' | 'description' | 'tags'
>;

export const updateDashboardMeta = async ({
  id,
  title,
  description = '',
  tags,
}: UpdateDashboardMetaProps) => {
  const [dashboard] = await findDashboardsByIds([id]);
  if (dashboard.status === 'error') {
    return;
  }

  const savedObjectsTaggingApi = savedObjectsTaggingService?.getTaggingApi();
  const references =
    savedObjectsTaggingApi?.ui.updateTagsReferences && tags.length
      ? savedObjectsTaggingApi.ui.updateTagsReferences(dashboard.references, tags)
      : dashboard.references;

  await contentManagementService.client.update<DashboardUpdateIn, DashboardUpdateOut>({
    contentTypeId: DASHBOARD_CONTENT_ID,
    id,
    data: { title, description },
    options: { references },
  });
};
