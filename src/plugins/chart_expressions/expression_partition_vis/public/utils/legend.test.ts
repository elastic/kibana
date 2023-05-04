/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartTypes, LegendDisplay } from '../../common/types';
import { createMockVisData } from '../mocks';
import { isLegendFlat, shouldShowLegend } from './legend';

describe('isLegendFlat', () => {
  const visData = createMockVisData();
  const splitChartDimension = visData.columns[0];

  const runIsFlatCommonScenario = (chartType: ChartTypes) => {
    it(`legend should be flat for ${chartType} if split dimension is specified`, () => {
      const flat = isLegendFlat(chartType, splitChartDimension);
      expect(flat).toBeTruthy();
    });

    it(`legend should be not flat for ${chartType} if split dimension is not specified`, () => {
      const flat = isLegendFlat(chartType, undefined);
      expect(flat).toBeFalsy();
    });
  };

  runIsFlatCommonScenario(ChartTypes.PIE);
  runIsFlatCommonScenario(ChartTypes.DONUT);
  runIsFlatCommonScenario(ChartTypes.TREEMAP);
  runIsFlatCommonScenario(ChartTypes.MOSAIC);

  it('legend should be flat for Waffle if split dimension is specified', () => {
    const flat = isLegendFlat(ChartTypes.WAFFLE, splitChartDimension);
    expect(flat).toBeTruthy();
  });

  it('legend should be flat for Waffle if split dimension is not specified', () => {
    const flat = isLegendFlat(ChartTypes.WAFFLE, undefined);
    expect(flat).toBeTruthy();
  });
});

describe('shouldShowLegend', () => {
  const visData = createMockVisData();

  const runCommonShouldShowLegendScenario = (chartType: ChartTypes) => {
    it(`should hide legend if legendDisplay = hide for ${chartType}`, () => {
      const show = shouldShowLegend(chartType, LegendDisplay.HIDE);
      expect(show).toBeFalsy();
    });

    it(`should show legend if legendDisplay = show for ${chartType}`, () => {
      const show = shouldShowLegend(chartType, LegendDisplay.SHOW);
      expect(show).toBeTruthy();
    });
  };

  const runShouldShowLegendDefaultBucketsScenario = (chartType: ChartTypes) => {
    it(`should show legend if legendDisplay = default and multiple buckets for ${chartType}`, () => {
      const show = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [
        visData.columns[0],
        visData.columns[1],
      ]);

      expect(show).toBeTruthy();
    });

    it(`should hide legend if legendDisplay = default and one bucket or less for ${chartType}`, () => {
      const show1 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [visData.columns[0]]);
      expect(show1).toBeFalsy();

      const show2 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, []);
      expect(show2).toBeFalsy();

      const show3 = shouldShowLegend(chartType, LegendDisplay.DEFAULT);
      expect(show3).toBeFalsy();
    });
  };

  const runShouldShowLegendDefaultAlwaysFalsyScenario = (chartType: ChartTypes) => {
    it(`should hide legend if legendDisplay = default and multiple buckets for ${chartType}`, () => {
      const show = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [
        visData.columns[0],
        visData.columns[1],
      ]);

      expect(show).toBeFalsy();
    });

    it(`should hide legend if legendDisplay = default and one bucket or less for ${chartType}`, () => {
      const show1 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [visData.columns[0]]);
      expect(show1).toBeFalsy();

      const show2 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, []);
      expect(show2).toBeFalsy();

      const show3 = shouldShowLegend(chartType, LegendDisplay.DEFAULT);
      expect(show3).toBeFalsy();
    });
  };

  const runShouldShowLegendDefaultAlwaysTruthyScenario = (chartType: ChartTypes) => {
    it(`should show legend if legendDisplay = default and multiple buckets for ${chartType}`, () => {
      const show = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [
        visData.columns[0],
        visData.columns[1],
      ]);

      expect(show).toBeTruthy();
    });

    it(`should show legend if legendDisplay = default and one bucket or less for ${chartType}`, () => {
      const show1 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, [visData.columns[0]]);
      expect(show1).toBeTruthy();

      const show2 = shouldShowLegend(chartType, LegendDisplay.DEFAULT, []);
      expect(show2).toBeTruthy();

      const show3 = shouldShowLegend(chartType, LegendDisplay.DEFAULT);
      expect(show3).toBeTruthy();
    });
  };

  runCommonShouldShowLegendScenario(ChartTypes.PIE);
  runShouldShowLegendDefaultBucketsScenario(ChartTypes.PIE);

  runCommonShouldShowLegendScenario(ChartTypes.DONUT);
  runShouldShowLegendDefaultBucketsScenario(ChartTypes.DONUT);

  runCommonShouldShowLegendScenario(ChartTypes.TREEMAP);
  runShouldShowLegendDefaultAlwaysFalsyScenario(ChartTypes.TREEMAP);

  runCommonShouldShowLegendScenario(ChartTypes.MOSAIC);
  runShouldShowLegendDefaultAlwaysFalsyScenario(ChartTypes.MOSAIC);

  runCommonShouldShowLegendScenario(ChartTypes.WAFFLE);
  runShouldShowLegendDefaultAlwaysTruthyScenario(ChartTypes.WAFFLE);
});
