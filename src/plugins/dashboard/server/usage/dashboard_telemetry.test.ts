/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedDashboardPanel730ToLatest } from '../../common';
import { getEmptyDashboardData, collectPanelsByType } from './dashboard_telemetry';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { createEmbeddablePersistableStateServiceMock } from '@kbn/embeddable-plugin/common/mocks';

const visualizationType1ByValue = {
  embeddableConfig: {
    savedVis: {
      type: 'type1',
    },
  },
  type: 'visualization',
} as unknown as SavedDashboardPanel730ToLatest;

const visualizationType2ByValue = {
  embeddableConfig: {
    savedVis: {
      type: 'type2',
    },
  },
  type: 'visualization',
} as unknown as SavedDashboardPanel730ToLatest;

const visualizationType2ByReference = {
  ...visualizationType2ByValue,
  id: '11111',
};

const lensTypeAByValue = {
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'a',
    },
  },
} as unknown as SavedDashboardPanel730ToLatest;

const lensTypeAByReference = {
  ...lensTypeAByValue,
  id: '22222',
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
} as unknown as SavedDashboardPanel730ToLatest;

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
} as unknown as SavedDashboardPanel730ToLatest;

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
    collectPanelsByType(panels, collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.total).toBe(panels.length);
    expect(collectorData.panels.by_value).toBe(2);
    expect(collectorData.panels.by_reference).toBe(1);
  });

  it('collects information about visualizations', () => {
    const panels = [
      visualizationType1ByValue,
      visualizationType1ByValue,
      visualizationType2ByValue,
      visualizationType2ByReference,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(panels, collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.by_type.visualization.total).toBe(panels.length);
    expect(collectorData.panels.by_type.visualization.by_value).toBe(3);
    expect(collectorData.panels.by_type.visualization.by_reference).toBe(1);
  });

  it('collects information about lens', () => {
    const panels = [
      lensTypeAByValue,
      lensTypeAByValue,
      lensTypeAByValue,
      lensTypeAByReference,
      lensXYSeriesA,
      lensXYSeriesA,
      lensXYSeriesB,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(panels, collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.by_type.lens.total).toBe(panels.length);
    expect(collectorData.panels.by_type.lens.by_value).toBe(6);
    expect(collectorData.panels.by_type.lens.by_reference).toBe(1);
  });

  it('collects information about a mix of panel types', () => {
    const panels = [
      visualizationType1ByValue,
      visualizationType1ByValue,
      visualizationType2ByReference,
      lensTypeAByValue,
      lensTypeAByValue,
      lensTypeAByValue,
      lensTypeAByReference,
      lensXYSeriesA,
    ];

    const collectorData = getEmptyDashboardData();
    collectPanelsByType(panels, collectorData, embeddablePersistableStateService);

    expect(collectorData.panels.total).toBe(panels.length);
    expect(collectorData.panels.by_type.lens.total).toBe(5);
    expect(collectorData.panels.by_type.lens.by_value).toBe(4);
    expect(collectorData.panels.by_type.lens.by_reference).toBe(1);
    expect(collectorData.panels.by_type.visualization.total).toBe(3);
    expect(collectorData.panels.by_type.visualization.by_value).toBe(2);
    expect(collectorData.panels.by_type.visualization.by_reference).toBe(1);
  });
});
