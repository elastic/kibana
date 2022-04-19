/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository, SavedObjectAttributes } from '@kbn/core/server';
import { SavedDashboardPanel730ToLatest } from '../../common';

export const findByValueEmbeddables = async (
  savedObjectClient: Pick<ISavedObjectsRepository, 'find'>,
  embeddableType: string
) => {
  const dashboards = await savedObjectClient.find<SavedObjectAttributes>({
    type: 'dashboard',
  });

  return dashboards.saved_objects
    .map((dashboard) => {
      try {
        return JSON.parse(
          dashboard.attributes.panelsJSON as string
        ) as unknown as SavedDashboardPanel730ToLatest[];
      } catch (exception) {
        return [];
      }
    })
    .flat()
    .filter((panel) => (panel as Record<string, any>).panelRefName === undefined)
    .filter((panel) => panel.type === embeddableType)
    .map((panel) => panel.embeddableConfig);
};
