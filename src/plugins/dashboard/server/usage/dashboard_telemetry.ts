/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ISavedObjectsRepository, SavedObjectAttributes } from 'src/core/server';
import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';
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
      };
    };
  };
}

export interface DashboardCollectorData {
  panels: number;
  panelsByValue: number;
  lensByValue: {
    [key: string]: number;
  };
  visualizationByValue: {
    [key: string]: number;
  };
}

export const getEmptyTelemetryData = (): DashboardCollectorData => ({
  panels: 0,
  panelsByValue: 0,
  lensByValue: {},
  visualizationByValue: {},
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
    }
  }
};

export const collectForPanels: DashboardCollectorFunction = (panels, collectorData) => {
  collectDashboardInfo(panels, collectorData);
  collectByValueVisualizationInfo(panels, collectorData);
  collectByValueLensInfo(panels, collectorData);
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

    const panels = (JSON.parse(
      attributes.panelsJSON as string
    ) as unknown) as SavedDashboardPanel730ToLatest[];

    collectForPanels(panels, collectorData);
  }

  return collectorData;
}
