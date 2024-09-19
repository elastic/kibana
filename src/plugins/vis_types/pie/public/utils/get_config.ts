/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionConfig, PartitionLayout, RecursivePartial, Theme } from '@elastic/charts';
import { LabelPositions, PieVisParams, PieContainerDimensions } from '../types';
const MAX_SIZE = 1000;

export const getConfig = (
  visParams: PieVisParams,
  chartTheme: RecursivePartial<Theme>,
  dimensions?: PieContainerDimensions
): RecursivePartial<PartitionConfig> => {
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

  const usingOuterSizeRatio =
    dimensions && !isSplitChart
      ? {
          outerSizeRatio: MAX_SIZE / Math.min(dimensions?.width, dimensions?.height),
        }
      : null;
  const config: RecursivePartial<PartitionConfig> = {
    partitionLayout: PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    ...usingOuterSizeRatio,
    specialFirstInnermostSector: false,
    minFontSize: 10,
    maxFontSize: 16,
    linkLabel: {
      maxCount: 5,
      fontSize: 11,
      textColor: chartTheme.axes?.axisTitle?.fill,
      maxTextLength: visParams.labels.truncate ?? undefined,
    },
    sectorLineStroke: chartTheme.lineSeriesStyle?.point?.fill,
    sectorLineWidth: 1.5,
    circlePadding: 4,
    emptySizeRatio: visParams.isDonut ? 0.3 : 0,
    ...usingMargin,
  };
  if (!visParams.labels.show) {
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

  if (
    (visParams.labels.position === LabelPositions.INSIDE || isSplitChart) &&
    visParams.labels.show
  ) {
    config.linkLabel = { maxCount: 0 };
  }
  return config;
};
