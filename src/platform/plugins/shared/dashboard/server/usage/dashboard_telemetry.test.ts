/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';
import type { SavedDashboardPanel } from '../../common/content_management/v1/types'; // TODO: This will be moved in https://github.com/elastic/kibana/issues/221295
import { collectPanelsByType, getEmptyDashboardData } from './dashboard_telemetry';

const visualizationType1ByValue = {
  embeddableConfig: {
    savedVis: {
      type: 'type1',
    },
  },
  gridData: {},
  panelIndex: '1',
  type: 'visualization',
} as unknown as SavedDashboardPanel;

const visualizationType2ByValue = {
  embeddableConfig: {
    savedVis: {
      type: 'type2',
    },
  },
  gridData: {},
  panelIndex: '2',
  type: 'visualization',
} as unknown as SavedDashboardPanel;

const visualizationType2ByReference = {
  ...visualizationType2ByValue,
  id: '11111',
  panelIndex: '3',
};

const lensTypeAByValue = {
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'a',
    },
  },
  gridData: {},
  panelIndex: '4',
} as unknown as SavedDashboardPanel;

const lensTypeAByReference = {
  ...lensTypeAByValue,
  id: '22222',
  panelIndex: '5',
};

const lensXYSeriesA = {
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'lnsXY',
      state: {
        visualization: {
          preferredSeriesType: 'seriesA',
        },
      },
    },
  },
  gridData: {},
  panelIndex: '6',
} as unknown as SavedDashboardPanel;

const lensXYSeriesB = {
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'lnsXY',
      state: {
        visualization: {
          preferredSeriesType: 'seriesB',
        },
        datasourceStates: {
          indexpattern: {
            layers: {
              first: {
                columns: {
                  first: {
                    operationType: 'terms',
                  },
                  second: {
                    operationType: 'formula',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  gridData: {},
  panelIndex: '7',
} as unknown as SavedDashboardPanel;

const embeddablePersistableStateService = createEmbeddablePersistableStateServiceMock();

describe('dashboard telemetry', () => {
  beforeAll(() => {
    embeddablePersistableStateService.extract.mockImplementationOnce((state) => {
      const { HARDCODED_ID, ...restOfState } = state as unknown as Record<string, unknown>;
      return {
        state: restOfState as EmbeddableStateWithType,
        references: [{ id: HARDCODED_ID as string, name: 'refName', type: 'type' }],
      };
    });

    embeddablePersistableStateService.inject.mockImplementationOnce((state, references) => {
      const ref = references.find((r) => r.name === 'refName');
      return {
        ...state,
        HARDCODED_ID: ref!.id,
      };
    });
  });

  it('collects information about dashboard panels', () => {
    const panels = [
      visualizationType1ByValue,
      visualizationType2ByValue,
      visualizationType2ByReference,
    ];
    const collectorData = getEmptyDashboardData();
    collectPanelsByType(JSON.stringify(panels), collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.total).toBe(panels.length);
    expect(collectorData.panels.by_value).toBe(2);
    expect(collectorData.panels.by_reference).toBe(1);
  });

  it('collects information about visualizations', () => {
    const panels = [
      visualizationType1ByValue,
      { ...visualizationType1ByValue, panelIndex: '8' },
      visualizationType2ByValue,
      visualizationType2ByReference,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(JSON.stringify(panels), collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.by_type.visualization.total).toBe(panels.length);
    expect(collectorData.panels.by_type.visualization.by_value).toBe(3);
    expect(collectorData.panels.by_type.visualization.by_reference).toBe(1);
  });

  it('collects information about lens', () => {
    const panels = [
      lensTypeAByValue,
      { ...lensTypeAByValue, panelIndex: '8' },
      { ...lensTypeAByValue, panelIndex: '9' },
      lensTypeAByReference,
      lensXYSeriesA,
      { ...lensXYSeriesA, panelIndex: '10' },
      lensXYSeriesB,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(JSON.stringify(panels), collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.by_type.lens.total).toBe(panels.length);
    expect(collectorData.panels.by_type.lens.by_value).toBe(6);
    expect(collectorData.panels.by_type.lens.by_reference).toBe(1);
  });

  it('collects information about a mix of panel types', () => {
    const panels = [
      visualizationType1ByValue,
      { ...visualizationType1ByValue, panelIndex: '8' },
      visualizationType2ByReference,
      lensTypeAByValue,
      { ...lensTypeAByValue, panelIndex: '9' },
      { ...lensTypeAByValue, panelIndex: '10' },
      lensTypeAByReference,
      lensXYSeriesA,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(JSON.stringify(panels), collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.total).toBe(panels.length);
    expect(collectorData.panels.by_type.lens.total).toBe(5);
    expect(collectorData.panels.by_type.lens.by_value).toBe(4);
    expect(collectorData.panels.by_type.lens.by_reference).toBe(1);
    expect(collectorData.panels.by_type.visualization.total).toBe(3);
    expect(collectorData.panels.by_type.visualization.by_value).toBe(2);
    expect(collectorData.panels.by_type.visualization.by_reference).toBe(1);
  });
});
