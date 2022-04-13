/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsRepository, SavedObjectAttributes } from 'src/core/server';
import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';
import { SavedDashboardPanel730ToLatest } from '../../common';
import { injectReferences } from '../../common/saved_dashboard_references';
export interface DashboardCollectorData {
  panels: number;
  panelsByValue: {
    total: number;
    by_type: {
      [key: string]: number;
    };
  };
  panelsByReference: {
    total: number;
    by_type: {
      [key: string]: number;
    };
  };
  embeddable: {
    [key: string]: number;
  };
}

export const getEmptyTelemetryData = (): DashboardCollectorData => ({
  panels: 0,
  panelsByValue: {
    total: 0,
    by_type: {},
  },
  panelsByReference: {
    total: 0,
    by_type: {},
  },
  embeddable: {},
});

type DashboardCollectorFunction = (
  panels: SavedDashboardPanel730ToLatest[],
  collectorData: DashboardCollectorData
) => void;

export const collectPanelsByType: DashboardCollectorFunction = (panels, collectorData) => {
  let saveMethodKey: keyof DashboardCollectorData;
  for (const panel of panels) {
    const type = panel.type;
    if (panel.id === undefined) {
      saveMethodKey = 'panelsByValue';
    } else {
      saveMethodKey = 'panelsByReference';
    }
    if (!collectorData[saveMethodKey].by_type[type]) {
      collectorData[saveMethodKey].by_type[type] = 0;
    }
    collectorData[saveMethodKey].total += 1;
    collectorData[saveMethodKey].by_type[type] += 1;
  }
};

export const collectForPanels: DashboardCollectorFunction = (panels, collectorData) => {
  collectorData.panels += panels.length;
  collectPanelsByType(panels, collectorData);
};

export const collectEmbeddableData = (
  panels: SavedDashboardPanel730ToLatest[],
  collectorData: DashboardCollectorData,
  embeddableService: EmbeddablePersistableStateService
) => {
  for (const panel of panels) {
    collectorData.embeddable = embeddableService.telemetry(
      {
        ...panel.embeddableConfig,
        id: panel.id || '',
        type: panel.type,
      },
      collectorData.embeddable
    );
  }
};

export async function collectDashboardTelemetry(
  savedObjectClient: Pick<ISavedObjectsRepository, 'find'>,
  embeddableService: EmbeddablePersistableStateService
) {
  const collectorData = getEmptyTelemetryData();
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

    collectForPanels(panels, collectorData);
    collectEmbeddableData(panels, collectorData, embeddableService);
  }

  return collectorData;
}
