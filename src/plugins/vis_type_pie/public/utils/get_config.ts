/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartitionConfig, PartitionLayout, RecursivePartial, Theme } from '@elastic/charts';
import { LabelPositions, PieVisParams } from '../types';

export const getConfig = (
  visParams: PieVisParams,
  chartTheme: RecursivePartial<Theme>
): RecursivePartial<PartitionConfig> => {
  const config: RecursivePartial<PartitionConfig> = {
    partitionLayout: PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    outerSizeRatio: 1,
    specialFirstInnermostSector: true,
    clockwiseSectors: false,
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
  };
  if (!visParams.labels.show) {
    // Force all labels to be linked, then prevent links from showing
    config.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
  }
  if (visParams.labels.position === LabelPositions.INSIDE) {
    config.linkLabel = { maxCount: 0 };
  }
  return config;
};
