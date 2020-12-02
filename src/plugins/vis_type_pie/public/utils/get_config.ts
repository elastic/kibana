/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
