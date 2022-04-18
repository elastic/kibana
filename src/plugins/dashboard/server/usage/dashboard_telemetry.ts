/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';
import { ISavedObjectsRepository, SavedObjectAttributes } from 'src/core/server';
import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';
import {
  CONTROL_GROUP_TYPE,
  initializeControlGroupTelemetry,
  RawControlGroupAttributes,
} from '../../../controls/common';
import { ControlGroupTelemetry } from '../../../controls/common';
import { SavedDashboardPanel730ToLatest } from '../../common';
import { injectReferences } from '../../common/saved_dashboard_references';

interface VisualizationPanel extends SavedDashboardPanel730ToLatest {
  embeddableConfig: {
    savedVis?: {
      type?: string;
    };
  };
}

interface LensPanel extends SavedDashboardPanel730ToLatest {
  embeddableConfig: {
    attributes?: {
      visualizationType?: string;
      state?: {
        visualization?: {
          preferredSeriesType?: string;
        };
        datasourceStates?: {
          indexpattern?: {
            layers: Record<
              string,
              {
                columns: Record<string, { operationType: string }>;
              }
            >;
          };
        };
      };
    };
  };
}

export interface DashboardCollectorData {
  panels: number;
  panelsByValue: number;
  controls: ControlGroupTelemetry;
  lensByValue: {
    [key: string]: number;
  };
  visualizationByValue: {
    [key: string]: number;
  };
  embeddable: {
    [key: string]: number;
  };
}

export const getEmptyTelemetryData = (): DashboardCollectorData => ({
  panels: 0,
  panelsByValue: 0,
  controls: initializeControlGroupTelemetry({}),
  lensByValue: {},
  visualizationByValue: {},
  embeddable: {},
});

type DashboardCollectorFunction = (
  panels: SavedDashboardPanel730ToLatest[],
  collectorData: DashboardCollectorData
) => void;

export const collectDashboardInfo: DashboardCollectorFunction = (panels, collectorData) => {
  collectorData.panels += panels.length;
  collectorData.panelsByValue += panels.filter((panel) => panel.id === undefined).length;
};

export const collectByValueVisualizationInfo: DashboardCollectorFunction = (
  panels,
  collectorData
) => {
  const byValueVisualizations = panels.filter(
    (panel) => panel.id === undefined && panel.type === 'visualization'
  );

  for (const panel of byValueVisualizations) {
    const visPanel = panel as VisualizationPanel;

    if (
      visPanel.embeddableConfig.savedVis !== undefined &&
      visPanel.embeddableConfig.savedVis.type !== undefined
    ) {
      const type = visPanel.embeddableConfig.savedVis.type;

      if (!collectorData.visualizationByValue[type]) {
        collectorData.visualizationByValue[type] = 0;
      }

      collectorData.visualizationByValue[type] = collectorData.visualizationByValue[type] + 1;
    }
  }
};

export const collectByValueLensInfo: DashboardCollectorFunction = (panels, collectorData) => {
  const byValueLens = panels.filter((panel) => panel.id === undefined && panel.type === 'lens');

  for (const panel of byValueLens) {
    const lensPanel = panel as LensPanel;

    if (lensPanel.embeddableConfig.attributes?.visualizationType !== undefined) {
      let type = lensPanel.embeddableConfig.attributes.visualizationType;

      if (type === 'lnsXY') {
        type =
          lensPanel.embeddableConfig.attributes.state?.visualization?.preferredSeriesType || type;
      }

      if (!collectorData.lensByValue[type]) {
        collectorData.lensByValue[type] = 0;
      }

      collectorData.lensByValue[type] = collectorData.lensByValue[type] + 1;

      const hasFormula = Object.values(
        lensPanel.embeddableConfig.attributes.state?.datasourceStates?.indexpattern?.layers || {}
      ).some((layer) =>
        Object.values(layer.columns).some((column) => column.operationType === 'formula')
      );

      if (hasFormula && !collectorData.lensByValue.formula) {
        collectorData.lensByValue.formula = 0;
      }
      if (hasFormula) {
        collectorData.lensByValue.formula++;
      }
    }
  }
};

export const collectForPanels: DashboardCollectorFunction = (panels, collectorData) => {
  collectDashboardInfo(panels, collectorData);
  collectByValueVisualizationInfo(panels, collectorData);
  collectByValueLensInfo(panels, collectorData);
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

    const controlGroupAttributes: RawControlGroupAttributes | undefined =
      attributes.controlGroupInput as unknown as RawControlGroupAttributes;
    if (!isEmpty(controlGroupAttributes)) {
      collectorData.controls = embeddableService.telemetry(
        {
          ...controlGroupAttributes,
          type: CONTROL_GROUP_TYPE,
          id: `DASHBOARD_${CONTROL_GROUP_TYPE}`,
        },
        collectorData.controls
      ) as ControlGroupTelemetry;
    }

    const panels = JSON.parse(
      attributes.panelsJSON as string
    ) as unknown as SavedDashboardPanel730ToLatest[];

    collectForPanels(panels, collectorData);
    collectEmbeddableData(panels, collectorData, embeddableService);
  }

  return collectorData;
}
