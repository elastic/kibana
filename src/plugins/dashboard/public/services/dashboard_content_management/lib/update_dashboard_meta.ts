/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { DashboardContainerInput, extractReferences } from '../../../../common';
import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { DashboardCrudTypes } from '../../../../common/content_management';
import { findDashboardsByIds } from './find_dashboards';
import { DashboardContentManagementRequiredServices } from '../types';

type UpdateDashboardMetaProps = Pick<
  DashboardContainerInput,
  'id' | 'title' | 'description' | 'tags'
>;
interface UpdateDashboardMetaDependencies {
  contentManagement: DashboardStartDependencies['contentManagement'];
  embeddable: DashboardContentManagementRequiredServices['embeddable'];
  savedObjectsTagging: DashboardContentManagementRequiredServices['savedObjectsTagging'];
}

export const updateDashboardMeta = async (
  { id, title, description = '', tags }: UpdateDashboardMetaProps,
  { contentManagement, savedObjectsTagging, embeddable }: UpdateDashboardMetaDependencies
) => {
  const [dashboard] = await findDashboardsByIds(contentManagement, [id]);
  if (dashboard.status === 'error') {
    return dashboard;
  }

  const dashboardReferences = [] as Reference[];
  const references =
    savedObjectsTagging.updateTagsReferences && tags.length
      ? savedObjectsTagging.updateTagsReferences(dashboardReferences, tags)
      : dashboardReferences;

  return await contentManagement.client.update<
    DashboardCrudTypes['UpdateIn'],
    DashboardCrudTypes['UpdateOut']
  >({
    contentTypeId: DASHBOARD_CONTENT_ID,
    id,
    data: { ...dashboard.attributes, title, description },
    options: { references },
  });
};
