/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionConfig, PartitionLayout, RecursivePartial, Theme } from '@elastic/charts';
import { Datatable } from '../../../../../../src/plugins/expressions';
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
  visData: Datatable,
  chartTheme: RecursivePartial<Theme>,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => Config;

type GetConfigFn = (
  visParams: PartitionVisParams,
  visData: Datatable,
  chartTheme: RecursivePartial<Theme>,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => Config;

const MAX_SIZE = 1000;

const getPieDonutWaffleCommonConfig: GetConfigFn = (
  visParams,
  visData,
  chartTheme,
  dimensions,
  rescaleFactor = 1
) => {
  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const preventLinksFromShowing =
    (visParams.labels.position === LabelPositions.INSIDE || isSplitChart) && visParams.labels.show;
  const saveRescaleFactor = visParams.labels.show && !preventLinksFromShowing;

  const usingOuterSizeRatio =
    dimensions && !isSplitChart && !saveRescaleFactor
      ? {
          outerSizeRatio:
            // Cap the ratio to 1 and then rescale
            rescaleFactor * Math.min(MAX_SIZE / Math.min(dimensions?.width, dimensions?.height), 1),
        }
      : {};

  const config: Config = { ...usingOuterSizeRatio };

  if (!visParams.labels.show || visParams.labels.position === LabelPositions.HIDE) {
    // Force all labels to be linked, then prevent links from showing
    config.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
  }

  if (visParams.labels.last_level && visParams.labels.show) {
    config.linkLabel = {
      maxCount: Number.POSITIVE_INFINITY,
      maximumSection: Number.POSITIVE_INFINITY,
      maxTextLength: visParams.labels.truncate ?? undefined,
    };
  }

  if (preventLinksFromShowing) {
    config.linkLabel = { maxCount: 0 };
  }

  if (saveRescaleFactor) {
    // shrink up to 20% to give some room for the linked values
    config.outerSizeRatio = rescaleFactor;
  }

  return { ...config };
};

const getTreemapMosaicCommonConfig: GetConfigFn = (visParams) => {
  if (!visParams.labels.show || visParams.labels.position === LabelPositions.HIDE) {
    return {
      fillLabel: { textColor: 'rgba(0,0,0,0)' },
    };
  }
  return {};
};

const getPieSpecificConfig: GetConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.sunburst,
    ...getPieDonutWaffleCommonConfig(...args),
  };
};

const getDonutSpecificConfig: GetConfigFn = (visParams, ...args) => {
  return {
    partitionLayout: PartitionLayout.sunburst,
    emptySizeRatio: visParams.emptySizeRatio,
    ...getPieDonutWaffleCommonConfig(visParams, ...args),
  };
};

const getWaffleSpecificConfig: GetConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.waffle,
    ...getPieDonutWaffleCommonConfig(...args),
  };
};

const getTreemapSpecificConfig: GetConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.treemap,
    ...getTreemapMosaicCommonConfig(...args),
  };
};

const getMosaicSpecificConfig: GetConfigFn = (...args) => {
  return {
    partitionLayout: PartitionLayout.mosaic,
    ...getTreemapMosaicCommonConfig(...args),
  };
};

const getSpecificConfig: GetConfigByTypeFn = (chartType, ...args) =>
  ({
    [ChartTypes.PIE]: getPieSpecificConfig(...args),
    [ChartTypes.DONUT]: getDonutSpecificConfig(...args),
    [ChartTypes.TREEMAP]: getTreemapSpecificConfig(...args),
    [ChartTypes.MOSAIC]: getMosaicSpecificConfig(...args),
    [ChartTypes.WAFFLE]: getWaffleSpecificConfig(...args),
  }[chartType]);

export const getConfig: GetConfigByTypeFn = (
  chartType,
  visParams,
  visData,
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
    specialFirstInnermostSector: false, // ?
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
      maxTextLength: visParams.labels.truncate ?? undefined,
    },
    ...usingMargin,
    ...getSpecificConfig(chartType, visParams, visData, chartTheme, dimensions, rescaleFactor),
  };
};
