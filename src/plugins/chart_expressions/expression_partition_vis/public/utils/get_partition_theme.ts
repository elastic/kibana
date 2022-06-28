/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RecursivePartial, Theme, PartialTheme } from '@elastic/charts';
import {
  ChartTypes,
  LabelPositions,
  PartitionVisParams,
  PieContainerDimensions,
} from '../../common/types';

type GetThemeByTypeFn = (
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => PartialTheme;

type GetThemeFn = (
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  chartTheme: RecursivePartial<Theme>,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => PartialTheme;

type GetPieDonutWaffleThemeFn = (
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
) => PartialTheme;

type GetTreemapMosaicThemeFn = (visParams: PartitionVisParams) => PartialTheme;

const MAX_SIZE = 1000;

const getPieDonutWaffleCommonTheme: GetPieDonutWaffleThemeFn = (
  visParams,
  dimensions,
  rescaleFactor = 1
) => {
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

  const theme: PartialTheme = {};
  theme.partition = { ...(usingOuterSizeRatio ?? {}) };

  if (
    visParams.labels.show &&
    visParams.labels.position === LabelPositions.DEFAULT &&
    visParams.labels.last_level
  ) {
    theme.partition.linkLabel = {
      maxCount: Number.POSITIVE_INFINITY,
      maximumSection: Number.POSITIVE_INFINITY,
      maxTextLength: visParams.labels.truncate ?? undefined,
    };
  }

  if (preventLinksFromShowing || !visParams.labels.show) {
    // Prevent links from showing
    theme.partition.linkLabel = {
      maxCount: 0,
      ...(!visParams.labels.show ? { maximumSection: Number.POSITIVE_INFINITY } : {}),
    };
  }

  if (!preventLinksFromShowing && dimensions && !isSplitChart) {
    // shrink up to 20% to give some room for the linked values
    theme.partition.outerSizeRatio = rescaleFactor;
  }

  return theme;
};

const getDonutSpecificTheme: GetPieDonutWaffleThemeFn = (visParams, ...args) => {
  const { partition, ...restTheme } = getPieDonutWaffleCommonTheme(visParams, ...args);
  return { ...restTheme, partition: { ...partition, emptySizeRatio: visParams.emptySizeRatio } };
};

const getTreemapMosaicCommonTheme: GetTreemapMosaicThemeFn = (visParams) => {
  if (!visParams.labels.show) {
    return {
      partition: {
        fillLabel: { textColor: 'rgba(0,0,0,0)' },
      },
    };
  }
  return {};
};

const getSpecificTheme: GetThemeByTypeFn = (chartType, visParams, dimensions, rescaleFactor) =>
  ({
    [ChartTypes.PIE]: () => getPieDonutWaffleCommonTheme(visParams, dimensions, rescaleFactor),
    [ChartTypes.DONUT]: () => getDonutSpecificTheme(visParams, dimensions, rescaleFactor),
    [ChartTypes.TREEMAP]: () => getTreemapMosaicCommonTheme(visParams),
    [ChartTypes.MOSAIC]: () => getTreemapMosaicCommonTheme(visParams),
    [ChartTypes.WAFFLE]: () => getPieDonutWaffleCommonTheme(visParams, dimensions, rescaleFactor),
  }[chartType]());

export const getPartitionTheme: GetThemeFn = (
  chartType,
  visParams,
  chartTheme,
  dimensions,
  rescaleFactor = 1
) => {
  // On small multiples we want the labels to only appear inside
  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const paddingProps: PartialTheme | null =
    dimensions && !isSplitChart
      ? {
          chartPaddings: {
            top: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            bottom: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            left: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
            right: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
          },
        }
      : null;
  const partition = {
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
      maxTextLength: visParams.labels.truncate ?? undefined,
    },
  };
  const { partition: specificPartition = {}, ...restSpecificTheme } = getSpecificTheme(
    chartType,
    visParams,
    dimensions,
    rescaleFactor
  );

  return {
    partition: { ...partition, ...specificPartition },
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    ...(paddingProps ?? {}),
    ...restSpecificTheme,
  };
};
