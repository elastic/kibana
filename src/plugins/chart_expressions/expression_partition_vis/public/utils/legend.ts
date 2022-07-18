/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '@kbn/expressions-plugin';
import { BucketColumns, ChartTypes, LegendDisplay } from '../../common/types';

type GetLegendIsFlatFn = (splitChartDimension: DatatableColumn | undefined) => boolean;

const isLegendFlatCommon: GetLegendIsFlatFn = (splitChartDimension) => Boolean(splitChartDimension);

export const isLegendFlat = (
  visType: ChartTypes,
  splitChartDimension: DatatableColumn | undefined
) =>
  ({
    [ChartTypes.PIE]: () => isLegendFlatCommon(splitChartDimension),
    [ChartTypes.DONUT]: () => isLegendFlatCommon(splitChartDimension),
    [ChartTypes.TREEMAP]: () => isLegendFlatCommon(splitChartDimension),
    [ChartTypes.MOSAIC]: () => isLegendFlatCommon(splitChartDimension),
    [ChartTypes.WAFFLE]: () => true,
  }[visType]());

const showIfBuckets = (bucketColumns: Array<Partial<BucketColumns>>) => bucketColumns.length > 1;

const showLegendDefault = (visType: ChartTypes, bucketColumns: Array<Partial<BucketColumns>>) =>
  ({
    [ChartTypes.PIE]: () => showIfBuckets(bucketColumns),
    [ChartTypes.DONUT]: () => showIfBuckets(bucketColumns),
    [ChartTypes.TREEMAP]: () => false,
    [ChartTypes.MOSAIC]: () => false,
    [ChartTypes.WAFFLE]: () => true,
  }[visType]());

export const shouldShowLegend = (
  visType: ChartTypes,
  legendDisplay: LegendDisplay,
  bucketColumns: Array<Partial<BucketColumns>> = []
) =>
  legendDisplay === LegendDisplay.SHOW ||
  (legendDisplay === LegendDisplay.DEFAULT && showLegendDefault(visType, bucketColumns));
