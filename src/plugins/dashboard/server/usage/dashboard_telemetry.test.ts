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

import { SavedDashboardPanel730ToLatest } from '../../common';
import {
  collectDashboardInfo,
  getEmptyTelemetryData,
  collectByValueVisualizationInfo,
  collectByValueLensInfo,
} from './dashboard_telemetry';

const visualizationType1ByValue = ({
  embeddableConfig: {
    savedVis: {
      type: 'type1',
    },
  },
  type: 'visualization',
} as unknown) as SavedDashboardPanel730ToLatest;

const visualizationType2ByValue = ({
  embeddableConfig: {
    savedVis: {
      type: 'type2',
    },
  },
  type: 'visualization',
} as unknown) as SavedDashboardPanel730ToLatest;
const visualizationType2ByReference = {
  ...visualizationType2ByValue,
  id: '11111',
};

const lensTypeAByValue = ({
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'a',
    },
  },
} as unknown) as SavedDashboardPanel730ToLatest;
const lensTypeAByReference = {
  ...lensTypeAByValue,
  id: '22222',
};

const lensXYSeriesA = ({
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
} as unknown) as SavedDashboardPanel730ToLatest;

const lensXYSeriesB = ({
  type: 'lens',
  embeddableConfig: {
    attributes: {
      visualizationType: 'lnsXY',
      state: {
        visualization: {
          preferredSeriesType: 'seriesB',
        },
      },
    },
  },
} as unknown) as SavedDashboardPanel730ToLatest;

describe('dashboard telemetry', () => {
  it('collects information about dashboard panels', () => {
    const panels = [
      visualizationType1ByValue,
      visualizationType2ByValue,
      visualizationType2ByReference,
    ];
    const collectorData = getEmptyTelemetryData();

    collectDashboardInfo(panels, collectorData);

    expect(collectorData.panels).toBe(panels.length);
    expect(collectorData.panelsByValue).toBe(2);
  });

  describe('visualizations', () => {
    it('collects information about by value visualizations', () => {
      const panels = [
        visualizationType1ByValue,
        visualizationType1ByValue,
        visualizationType2ByValue,
        visualizationType2ByReference,
      ];

      const collectorData = getEmptyTelemetryData();

      collectByValueVisualizationInfo(panels, collectorData);

      expect(collectorData.visualizationByValue.type1).toBe(2);
      expect(collectorData.visualizationByValue.type2).toBe(1);
    });

    it('handles misshapen visualization panels without errors', () => {
      const badVisualizationPanel = ({
        embeddableConfig: {},
        type: 'visualization',
      } as unknown) as SavedDashboardPanel730ToLatest;

      const panels = [badVisualizationPanel, visualizationType1ByValue];

      const collectorData = getEmptyTelemetryData();

      collectByValueVisualizationInfo(panels, collectorData);

      expect(Object.keys(collectorData.visualizationByValue)).toHaveLength(1);
    });
  });

  describe('lens', () => {
    it('collects information about by value lens', () => {
      const panels = [
        lensTypeAByValue,
        lensTypeAByValue,
        lensTypeAByValue,
        lensTypeAByReference,
        lensXYSeriesA,
        lensXYSeriesA,
        lensXYSeriesB,
      ];

      const collectorData = getEmptyTelemetryData();

      collectByValueLensInfo(panels, collectorData);

      expect(collectorData.lensByValue.a).toBe(3);
      expect(collectorData.lensByValue.seriesA).toBe(2);
      expect(collectorData.lensByValue.seriesB).toBe(1);
    });

    it('handles misshapen lens panels', () => {
      const badPanel = ({
        type: 'lens',
        embeddableConfig: {
          oops: 'no visualization type',
        },
      } as unknown) as SavedDashboardPanel730ToLatest;

      const panels = [badPanel, lensTypeAByValue];

      const collectorData = getEmptyTelemetryData();

      collectByValueLensInfo(panels, collectorData);

      expect(collectorData.lensByValue.a).toBe(1);
    });
  });
});
