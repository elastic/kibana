/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository, SavedObjectAttributes } from 'kibana/server';
import { SavedDashboardPanel730ToLatest } from '../../common';

export const findByValueEmbeddables = async (
  savedObjectClient: Pick<ISavedObjectsRepository, 'find'>,
  embeddableType: string
): Promise<
  Array<{
    embeddable: { [key: string]: unknown };
    dashboardInfo: { updated_at?: string; id?: string };
  }>
> => {
  const dashboards = await savedObjectClient.find<SavedObjectAttributes>({
    type: 'dashboard',
  });

  return dashboards.saved_objects
    .map((dashboard) => {
      try {
        return ((JSON.parse(
          dashboard.attributes.panelsJSON as string
        ) as unknown) as SavedDashboardPanel730ToLatest[]).map((panel) => ({
          panel,
          dashboardInfo: { id: dashboard.id, updated_at: dashboard.updated_at },
        }));
      } catch (exception) {
        return [];
      }
    })
    .flat()
    .filter((item) => (item.panel as Record<string, unknown>).panelRefName === undefined)
    .filter((item) => item.panel.type === embeddableType)
    .map((item) => ({
      embeddable: item.panel.embeddableConfig,
      dashboardInfo: item.dashboardInfo,
    }));
};
