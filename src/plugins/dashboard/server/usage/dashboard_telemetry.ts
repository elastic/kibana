/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository, SavedObjectAttributes } from '@kbn/core/server';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import { SavedDashboardPanel730ToLatest } from '../../common';
import { injectReferences } from '../../common/saved_dashboard_references';
export interface DashboardCollectorData {
  panels: {
    total: number;
    by_reference: number;
    by_value: number;
    by_type: {
      [key: string]: {
        total: number;
        by_reference: number;
        by_value: number;
        details: {
          [key: string]: number;
        };
      };
    };
  };
}

export const getEmptyDashboardData = (): DashboardCollectorData => ({
  panels: {
    total: 0,
    by_reference: 0,
    by_value: 0,
    by_type: {},
  },
});

export const getEmptyPanelTypeData = () => ({
  total: 0,
  by_reference: 0,
  by_value: 0,
  details: {},
});

export const collectPanelsByType = (
  panels: SavedDashboardPanel730ToLatest[],
  collectorData: DashboardCollectorData,
  embeddableService: EmbeddablePersistableStateService
) => {
  collectorData.panels.total += panels.length;

  for (const panel of panels) {
    const type = panel.type;
    if (!collectorData.panels.by_type[type]) {
      collectorData.panels.by_type[type] = getEmptyPanelTypeData();
    }
    collectorData.panels.by_type[type].total += 1;
    if (panel.id === undefined) {
      collectorData.panels.by_value += 1;
      collectorData.panels.by_type[type].by_value += 1;
    } else {
      collectorData.panels.by_reference += 1;
      collectorData.panels.by_type[type].by_reference += 1;
    }
    // the following "details" need a follow-up that will actually properly consolidate
    // the data from all embeddables - right now, the only data that is kept is the
    // telemetry for the **final** embeddable of that type
    collectorData.panels.by_type[type].details = embeddableService.telemetry(
      {
        ...panel.embeddableConfig,
        id: panel.id || '',
        type: panel.type,
      },
      collectorData.panels.by_type[type].details
    );
  }
};

export async function collectDashboardTelemetry(
  savedObjectClient: Pick<ISavedObjectsRepository, 'find'>,
  embeddableService: EmbeddablePersistableStateService
) {
  const collectorData = getEmptyDashboardData();
  const dashboards = await savedObjectClient.find<SavedObjectAttributes>({
    type: 'dashboard',
  });

  for (const dashboard of dashboards.saved_objects) {
    const attributes = injectReferences(dashboard, {
      embeddablePersistableStateService: embeddableService,
    });

    const panels = JSON.parse(
      attributes.panelsJSON as string
    ) as unknown as SavedDashboardPanel730ToLatest[];

    collectPanelsByType(panels, collectorData, embeddableService);
  }

  return collectorData;
}
