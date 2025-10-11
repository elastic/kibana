/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';

import { getDashboardContentManagementCache } from '..';
import type { DashboardGetIn, DashboardGetOut } from '../../../../server/content_management';
import { DEFAULT_DASHBOARD_STATE } from '../../../dashboard_api/default_dashboard_state';
import { DASHBOARD_CONTENT_ID } from '../../../utils/telemetry_constants';
import { contentManagementService, savedObjectsTaggingService, coreServices } from '../../kibana_services';
import type { LoadDashboardFromSavedObjectProps, LoadDashboardReturn } from '../types';

export const loadDashboardState = async ({
  id,
}: LoadDashboardFromSavedObjectProps): Promise<LoadDashboardReturn> => {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  const savedObjectId = id;

  const newDashboardState = { ...DEFAULT_DASHBOARD_STATE };

  if (!savedObjectId) {
    return {
      dashboardInput: newDashboardState,
      dashboardFound: true,
      newDashboardCreated: true,
      references: [],
    };
  }

  let rawDashboardContent: DashboardGetOut['item'];
  let resolveMeta: DashboardGetOut['meta'];

  const cachedDashboard = dashboardContentManagementCache.fetchDashboard(id);

  if (cachedDashboard) {
    ({ item: rawDashboardContent, meta: resolveMeta } = cachedDashboard);
  } else {
    const result = await coreServices.http.get(`/api/dashboards/dashboard/${id}`)
      .catch((e) => {
        if (e.response?.status === 404) {
          throw new SavedObjectNotFound({ type: DASHBOARD_CONTENT_ID, id });
        }
        const message = (e.body as { message?: string })?.message ?? e.message;
        throw new Error(message);
      });

    rawDashboardContent = {
      id: result.id,
      type: result.type,
      attributes: result.data,
      references: result.data.references || [],
      version: result.meta.version,
      createdAt: result.meta.createdAt,
      updatedAt: result.meta.updatedAt,
      createdBy: result.meta.createdBy,
      updatedBy: result.meta.updatedBy,
      managed: result.meta.managed,
      error: result.meta.error,
      namespaces: result.data.namespaces || result.data.spaces || [],
      originId: undefined,
    };

    resolveMeta = {
      outcome: 'exactMatch',
      aliasTargetId: undefined,
      aliasPurpose: undefined,
    };

    const { outcome: loadOutcome } = resolveMeta;
    if (loadOutcome !== 'aliasMatch') {
      dashboardContentManagementCache.addDashboard({ item: rawDashboardContent, meta: resolveMeta });
    }
  }

  if (!rawDashboardContent || !rawDashboardContent.version) {
    return {
      dashboardInput: newDashboardState,
      dashboardFound: false,
      dashboardId: savedObjectId,
      references: [],
    };
  }

  const { references, attributes, managed, version } = rawDashboardContent;

  const {
    refreshInterval,
    description,
    timeRestore,
    options,
    panels,
    filters,
    query,
    timeRange,
    title,
  } = attributes;

  return {
    managed,
    references,
    resolveMeta: { ...resolveMeta, version },
    dashboardInput: {
      ...options,
      refreshInterval,
      timeRestore,
      description,
      timeRange,
      filters,
      panels,
      query,
      title,
      tags:
        savedObjectsTaggingService?.getTaggingApi()?.ui.getTagIdsFromReferences(references) ?? [],

      controlGroupInput: attributes.controlGroupInput,
    },
    dashboardFound: true,
    dashboardId: savedObjectId,
  };
};
