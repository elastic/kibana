/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { toTableListViewSavedObject } from '@kbn/visualizations-plugin/public';

import { SAVED_OBJECT_LOADED_TIME } from '../../../utils/telemetry_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../../common/constants';
import {
  coreServices,
  savedObjectsTaggingService,
  visualizationsService,
} from '../../../services/kibana_services';
import { findService } from '../../../dashboard_client';
import { getAccessControlClient } from '../../../services/access_control_service';
import {
  TAB_IDS,
  type TabId,
  type DashboardListingUserContent,
  type DashboardVisualizationUserContent,
  type DashboardSavedObjectUserContent,
} from '../../types';

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';

const getReferenceIds = (refs?: Reference[]) => refs?.map((r) => r.id);

export async function findDashboardListingItems(
  searchTerm: string,
  tabId: TabId,
  options?: { references?: Reference[]; referencesToExclude?: Reference[] }
): Promise<{ total: number; hits: DashboardListingUserContent[] }> {
  const { references, referencesToExclude } = options ?? {};
  const limit = coreServices.uiSettings.get<number>(SAVED_OBJECTS_LIMIT_SETTING);
  const startTime = window.performance.now();

  const reportSearchDuration = (type: string) => {
    reportPerformanceMetricEvent(coreServices.analytics, {
      eventName: SAVED_OBJECT_LOADED_TIME,
      duration: window.performance.now() - startTime,
      meta: { saved_object_type: type },
    });
  };

  if (tabId === TAB_IDS.VISUALIZATIONS) {
    const response = await visualizationsService.findListItems(
      searchTerm,
      limit,
      references,
      referencesToExclude
    );
    reportSearchDuration('visualization');

    return {
      total: response.total,
      hits: response.hits.map((hit) => {
        const item = toTableListViewSavedObject(hit) as DashboardVisualizationUserContent;
        return { ...item, type: item.savedObjectType || item.type };
      }),
    };
  }

  // For dashboards, check access control
  const accessControlClient = getAccessControlClient();

  const [userResponse, globalPrivilegeResponse] = await Promise.allSettled([
    coreServices.userProfile.getCurrent(),
    accessControlClient.checkGlobalPrivilege(DASHBOARD_SAVED_OBJECT_TYPE),
  ]);

  const userId = userResponse.status === 'fulfilled' ? userResponse.value.uid : undefined;
  const isGloballyAuthorized =
    globalPrivilegeResponse.status === 'fulfilled' ? globalPrivilegeResponse.value : undefined;

  const { total, dashboards } = await findService.search({
    search: searchTerm,
    per_page: limit,
    tags: {
      included: getReferenceIds(references) ?? [],
      excluded: getReferenceIds(referencesToExclude) ?? [],
    },
  });
  reportSearchDuration(DASHBOARD_SAVED_OBJECT_TYPE);

  const tagApi = savedObjectsTaggingService?.getTaggingApi();
  return {
    total,
    hits: dashboards.map(({ id, data, meta }) => {
      const canManageAccessControl =
        isGloballyAuthorized ||
        accessControlClient.checkUserAccessControl({
          accessControl: {
            owner: data?.access_control?.owner,
            accessMode: data?.access_control?.access_mode,
          },
          createdBy: meta.created_at,
          userId,
        });

      return {
        type: 'dashboard' as const,
        id,
        updatedAt: meta.updated_at!,
        createdAt: meta.created_at,
        createdBy: meta.created_by,
        updatedBy: meta.updated_by,
        references: tagApi && data.tags ? data.tags.map(tagApi.ui.tagIdToReference) : [],
        managed: meta.managed,
        canManageAccessControl,
        accessMode: data?.access_control?.access_mode,
        attributes: {
          title: data.title,
          description: data.description,
          timeRestore: Boolean(data.time_range),
        },
      } as DashboardSavedObjectUserContent;
    }),
  };
}
