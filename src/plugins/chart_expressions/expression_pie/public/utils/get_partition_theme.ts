/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PartialTheme } from '@elastic/charts';
import { Required } from '@kbn/utility-types';
import { LabelPositions, PieVisParams, PieContainerDimensions } from '../../common/types';

const MAX_SIZE = 1000;

export const getPartitionTheme = (
  visParams: PieVisParams,
  chartTheme: PartialTheme,
  dimensions?: PieContainerDimensions,
  rescaleFactor: number = 1
): PartialTheme => {
  // On small multiples we want the labels to only appear inside
  const isSplitChart = Boolean(visParams.dimensions.splitColumn || visParams.dimensions.splitRow);
  const paddingProps: PartialTheme | null =
    dimensions && !isSplitChart
      ? {
          chartPaddings: {
            // TODO: simplify ratio logic to be static px units
            top: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            bottom: ((1 - Math.min(1, MAX_SIZE / dimensions?.height)) / 2) * dimensions?.height,
            left: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
            right: ((1 - Math.min(1, MAX_SIZE / dimensions?.width)) / 2) * dimensions?.height,
          },
        }
      : null;

  const outerSizeRatio: PartialTheme['partition'] | null =
    dimensions && !isSplitChart
      ? {
          outerSizeRatio:
            // Cap the ratio to 1 and then rescale
            rescaleFactor * Math.min(MAX_SIZE / Math.min(dimensions?.width, dimensions?.height), 1),
        }
      : null;
  const theme: Required<PartialTheme, 'partition'> = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    ...paddingProps,
    partition: {
      fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
      ...outerSizeRatio,
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
      emptySizeRatio: visParams.isDonut ? visParams.emptySizeRatio : 0,
    },
  };
  if (!visParams.labels.show) {
    // Force all labels to be linked, then prevent links from showing
    theme.partition.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
  }

  if (visParams.labels.last_level && visParams.labels.show) {
    theme.partition.linkLabel = {
      maxCount: Number.POSITIVE_INFINITY,
      maximumSection: Number.POSITIVE_INFINITY,
      maxTextLength: visParams.labels.truncate ?? undefined,
    };
  }

  if (
    (visParams.labels.position === LabelPositions.INSIDE || isSplitChart) &&
    visParams.labels.show
  ) {
    theme.partition.linkLabel = { maxCount: 0 };
  }

  return theme;
};
