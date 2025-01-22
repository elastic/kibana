/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PartialTheme } from '@elastic/charts';
import {
  ChartTypes,
  LabelPositions,
  PartitionVisParams,
  PieContainerDimensions,
} from '../../common/types';

const MAX_SIZE = 1000;

function getPieDonutWaffleCommonTheme(
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor = 1
): PartialTheme['partition'] {
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

  const partitionTheme: PartialTheme['partition'] = { ...(usingOuterSizeRatio ?? {}) };

  if (
    visParams.labels.show &&
    visParams.labels.position === LabelPositions.DEFAULT &&
    visParams.labels.last_level
  ) {
    partitionTheme.linkLabel = {
      maxCount: Number.POSITIVE_INFINITY,
      maximumSection: Number.POSITIVE_INFINITY,
      maxTextLength: visParams.labels.truncate ?? undefined,
    };
  }

  if (preventLinksFromShowing || !visParams.labels.show) {
    // Prevent links from showing
    partitionTheme.linkLabel = {
      maxCount: 0,
      ...(!visParams.labels.show ? { maximumSection: Number.POSITIVE_INFINITY } : {}),
    };
  }

  if (!preventLinksFromShowing && dimensions && !isSplitChart) {
    // shrink up to 20% to give some room for the linked values
    partitionTheme.outerSizeRatio = rescaleFactor;
  }

  return partitionTheme;
}

function getDonutSpecificTheme(
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
): PartialTheme['partition'] {
  const partition = getPieDonutWaffleCommonTheme(visParams, dimensions, rescaleFactor);
  return { ...partition, emptySizeRatio: visParams.emptySizeRatio };
}

function getTreemapMosaicCommonTheme(visParams: PartitionVisParams): PartialTheme['partition'] {
  return !visParams.labels.show ? { fillLabel: { textColor: 'rgba(0,0,0,0)' } } : {};
}

function getSpecificTheme(
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor?: number
): PartialTheme['partition'] {
  switch (chartType) {
    case ChartTypes.PIE:
      return getPieDonutWaffleCommonTheme(visParams, dimensions, rescaleFactor);
    case ChartTypes.DONUT:
      return getDonutSpecificTheme(visParams, dimensions, rescaleFactor);
    case ChartTypes.TREEMAP:
      return getTreemapMosaicCommonTheme(visParams);
    case ChartTypes.MOSAIC:
      return getTreemapMosaicCommonTheme(visParams);
    case ChartTypes.WAFFLE:
      return getPieDonutWaffleCommonTheme(visParams, dimensions, rescaleFactor);
  }
}

export function getPartitionTheme(
  chartType: ChartTypes,
  visParams: PartitionVisParams,
  dimensions?: PieContainerDimensions,
  rescaleFactor = 1,
  hasOpenedOnAggBasedEditor?: boolean
): PartialTheme {
  // On small multiples we want the labels to only appear inside
  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const paddingProps: PartialTheme =
    dimensions && !isSplitChart && hasOpenedOnAggBasedEditor
      ? {
          chartPaddings: {
            top: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            bottom: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            left: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
            right: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
          },
        }
      : {};

  const specificPartition = getSpecificTheme(chartType, visParams, dimensions, rescaleFactor);

  return {
    partition: {
      outerSizeRatio: 1,
      minFontSize: 10,
      maxFontSize: 16,
      emptySizeRatio: 0,
      sectorLineWidth: 1.5,
      circlePadding: 4,
      ...specificPartition,
      linkLabel: {
        // fontSize: 11,
        maxTextLength: visParams.labels.truncate ?? undefined,
        maxCount: 5,
        ...specificPartition?.linkLabel,
      },
    },
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    ...paddingProps,
  };
}
