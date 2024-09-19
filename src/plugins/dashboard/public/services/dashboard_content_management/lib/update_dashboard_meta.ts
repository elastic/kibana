/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardContainerInput } from '../../../../common';
import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { DashboardCrudTypes } from '../../../../common/content_management';
import { findDashboardsByIds } from './find_dashboards';
import { savedObjectsTaggingService } from '../../kibana_services';

type UpdateDashboardMetaProps = Pick<
  DashboardContainerInput,
  'id' | 'title' | 'description' | 'tags'
>;
interface UpdateDashboardMetaDependencies {
  contentManagement: DashboardStartDependencies['contentManagement'];
}

export const updateDashboardMeta = async (
  { id, title, description = '', tags }: UpdateDashboardMetaProps,
  { contentManagement }: UpdateDashboardMetaDependencies
) => {
  const taggingApi = savedObjectsTaggingService?.getTaggingApi();
  const [dashboard] = await findDashboardsByIds(contentManagement, [id]);
  if (dashboard.status === 'error') {
    return;
  }

  const references =
    taggingApi?.ui.updateTagsReferences && tags.length
      ? taggingApi.ui.updateTagsReferences(dashboard.references, tags)
      : dashboard.references;

  await contentManagement.client.update<
    DashboardCrudTypes['UpdateIn'],
    DashboardCrudTypes['UpdateOut']
  >({
    contentTypeId: DASHBOARD_CONTENT_ID,
    id,
    data: { title, description },
    options: { references },
  });
};
