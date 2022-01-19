/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionConfig, PartitionLayout, RecursivePartial, Theme } from '@elastic/charts';
import {
  ChartTypes,
  LabelPositions,
  PartitionVisParams,
  PieContainerDimensions,
} from '../../common/types';

type Config = RecursivePartial<PartitionConfig>;

type GetConfigByTypeFn = (
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => Config;

type GetConfigFn = (
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  chartTheme: RecursivePartial<Theme>,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => Config;

type GetPieDonutWaffleConfigFn = (
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => Config;

type GetTreemapMosaicConfigFn = (visParams: PartitionVisParams) => Config;

const MAX_SIZE = 1000;

const getPieDonutWaffleCommonConfig: GetPieDonutWaffleConfigFn = (
  visParams,
  dimensions,
  rescaleFactor = 1
) => {
  const { startFromSecondLargestSlice } = visParams;

  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const preventLinksFromShowing =
    (visParams.labels.position === LabelPositions.INSIDE || isSplitChart) && visParams.labels.show;

  const usingOuterSizeRatio =
    dimensions && !isSplitChart
      ? {
          outerSizeRatio:
            // Cap the ratio to 1 and then rescale
            rescaleFactor * Math.min(MAX_SIZE / Math.min(dimensions?.width, dimensions?.height), 1),
        }
      : { outerSizeRatio: undefined };

  const config: Config = { ...(usingOuterSizeRatio ?? {}) };

  if (startFromSecondLargestSlice !== undefined) {
    config.specialFirstInnermostSector = startFromSecondLargestSlice;
  }

  if (
    visParams.labels.show &&
    visParams.labels.position === LabelPositions.DEFAULT &&
    visParams.labels.last_level
  ) {
    config.linkLabel = {
      maxCount: Number.POSITIVE_INFINITY,
      maximumSection: Number.POSITIVE_INFINITY,
    };
  }

  if (preventLinksFromShowing || !visParams.labels.show) {
    // Prevent links from showing
    config.linkLabel = {
      maxCount: 0,
      ...(!visParams.labels.show ? { maximumSection: Number.POSITIVE_INFINITY } : {}),
    };
  }

  if (!preventLinksFromShowing && dimensions && !isSplitChart) {
    // shrink up to 20% to give some room for the linked values
    config.outerSizeRatio = rescaleFactor;
  }

  return { ...config };
};

const getTreemapMosaicCommonConfig: GetTreemapMosaicConfigFn = (visParams) => {
  if (!visParams.labels.show) {
    return {
      fillLabel: { textColor: 'rgba(0,0,0,0)' },
    };
  }
  return {};
};

const getPieSpecificConfig: GetPieDonutWaffleConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.sunburst,
    ...getPieDonutWaffleCommonConfig(...args),
  };
};

const getDonutSpecificConfig: GetPieDonutWaffleConfigFn = (visParams, ...args) => {
  return {
    partitionLayout: PartitionLayout.sunburst,
    emptySizeRatio: visParams.emptySizeRatio,
    ...getPieDonutWaffleCommonConfig(visParams, ...args),
  };
};

const getWaffleSpecificConfig: GetPieDonutWaffleConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.waffle,
    ...getPieDonutWaffleCommonConfig(...args),
  };
};

const getTreemapSpecificConfig: GetTreemapMosaicConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.treemap,
    ...getTreemapMosaicCommonConfig(...args),
  };
};

const getMosaicSpecificConfig: GetTreemapMosaicConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.mosaic,
    ...getTreemapMosaicCommonConfig(...args),
  };
};

const getSpecificConfig: GetConfigByTypeFn = (chartType, visParams, dimensions, rescaleFactor) =>
  ({
    [ChartTypes.PIE]: () => getPieSpecificConfig(visParams, dimensions, rescaleFactor),
    [ChartTypes.DONUT]: () => getDonutSpecificConfig(visParams, dimensions, rescaleFactor),
    [ChartTypes.TREEMAP]: () => getTreemapSpecificConfig(visParams),
    [ChartTypes.MOSAIC]: () => getMosaicSpecificConfig(visParams),
    [ChartTypes.WAFFLE]: () => getWaffleSpecificConfig(visParams, dimensions, rescaleFactor),
  }[chartType]());

export const getConfig: GetConfigFn = (
  chartType,
  visParams,
  chartTheme,
  dimensions,
  rescaleFactor = 1
) => {
  // On small multiples we want the labels to only appear inside
  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const usingMargin =
    dimensions && !isSplitChart
      ? {
          margin: {
            top: (1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2,
            bottom: (1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2,
            left: (1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2,
            right: (1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2,
          },
        }
      : null;

  return {
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    outerSizeRatio: 1,
    minFontSize: 10,
    maxFontSize: 16,
    emptySizeRatio: 0,
    sectorLineStroke: chartTheme.lineSeriesStyle?.point?.fill,
    sectorLineWidth: 1.5,
    circlePadding: 4,
    linkLabel: {
      maxCount: 5,
      fontSize: 11,
      textColor: chartTheme.axes?.axisTitle?.fill,
      ...(visParams.labels.truncate ? { maxTextLength: visParams.labels.truncate } : {}),
    },
    ...usingMargin,
    ...getSpecificConfig(chartType, visParams, dimensions, rescaleFactor),
  };
};
