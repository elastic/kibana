/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';

export const openDashboard = async (page: ScoutPage, dashboardId: string) => {
  await page.gotoApp('dashboards', { hash: `/view/${dashboardId}` });
};

export const importSavedObjects = async (kbnClient: KbnClient, spaceId: string, archivePath: string) => {
  await kbnClient.importExport.load(archivePath, { space: spaceId });
};

export const getSavedObjectIdByTitle = async (
  kbnClient: KbnClient,
  spaceId: string,
  type: string,
  title: string
) => {
  const response = await kbnClient.request({
    method: 'GET',
    path: `/s/${spaceId}/api/saved_objects/_find?type=${encodeURIComponent(
      type
    )}&search_fields=title&search=${encodeURIComponent(title)}`,
  });

  const savedObjects = response.data?.saved_objects ?? [];
  const match = savedObjects.find((savedObject: any) => savedObject.attributes?.title === title);
  if (!match) {
    throw new Error(`Saved object "${title}" (${type}) not found in space "${spaceId}"`);
  }

  return match.id as string;
};

export const setDefaultIndexByTitle = async (
  kbnClient: KbnClient,
  spaceId: string,
  title: string
) => {
  const response = await kbnClient.request({
    method: 'GET',
    path: `/s/${spaceId}/api/data_views`,
  });
  const dataViews = response.data?.data_view ?? [];
  const match = dataViews.find(
    (dataView: any) => dataView.name === title || dataView.title === title
  );
  if (!match?.id) {
    throw new Error(`Data view "${title}" not found in space "${spaceId}"`);
  }

  await kbnClient.uiSettings.update({ defaultIndex: match.id }, { space: spaceId });
};

export const getDashboardPanels = async (
  kbnClient: KbnClient,
  spaceId: string,
  dashboardId: string
) => {
  const response = await kbnClient.request({
    method: 'GET',
    path: `/s/${spaceId}/api/saved_objects/dashboard/${dashboardId}`,
  });
  return JSON.parse(response.data?.attributes?.panelsJSON ?? '[]') as Array<{
    embeddableConfig?: {
      enhancements?: { dynamicActions?: { events?: unknown[] } };
    };
  }>;
};

