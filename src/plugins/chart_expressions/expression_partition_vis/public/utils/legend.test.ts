/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartTypes } from '../../common/types';
import { createMockVisData } from '../mocks';
import { isLegendFlat } from './legend';

describe('isLegendFlat', () => {
  const visData = createMockVisData();
  const splitChartDimension = visData.columns[0];

  const runIsFlatCommonScenario = (chartType: ChartTypes) => {
    it(`legend should be flat for ${chartType} if split dimension is specified`, () => {
      const flat = isLegendFlat(chartType, splitChartDimension);
      expect(flat).toBeTruthy();
    });

    it('legend should be not flat for ${chartType} if split dimension is not specified', () => {
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
