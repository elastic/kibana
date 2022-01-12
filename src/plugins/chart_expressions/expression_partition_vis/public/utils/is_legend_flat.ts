/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '../../../../expressions';
import { ChartTypes } from '../../common/types';

type GetLegendIsFlatFn = (splitChartDimension: DatatableColumn | undefined) => boolean;

const isLegendFlatCommon: GetLegendIsFlatFn = (splitChartDimension) => Boolean(splitChartDimension);

const isLegendFlatWaffle: GetLegendIsFlatFn = (splitChartDimension) => true;

export const isLegendFlat = (
  visType: ChartTypes,
  splitChartDimension: DatatableColumn | undefined
) =>
  ({
    [ChartTypes.PIE]: isLegendFlatCommon(splitChartDimension),
    [ChartTypes.DONUT]: isLegendFlatCommon(splitChartDimension),
    [ChartTypes.TREEMAP]: isLegendFlatCommon(splitChartDimension),
    [ChartTypes.MOSAIC]: isLegendFlatCommon(splitChartDimension),
    [ChartTypes.WAFFLE]: isLegendFlatWaffle(splitChartDimension),
  }[visType]);
