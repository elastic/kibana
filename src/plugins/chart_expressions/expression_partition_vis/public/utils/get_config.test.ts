/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { getConfig } from './get_config';
import { createMockPieParams } from '../mocks';
import { ChartTypes, LabelPositions, PartitionVisParams } from '../../common/types';
import { RecursivePartial } from '@elastic/eui';
import { PartitionConfig, PartitionLayout, Theme } from '@elastic/charts';

const column: ExpressionValueVisDimension = {
  type: 'vis_dimension',
  accessor: { id: 'col-1-1', name: 'Count', meta: { type: 'number' } },
  format: {
    id: 'terms',
    params: {
      id: 'string',
      otherBucketLabel: 'Other',
      missingBucketLabel: 'Missing',
    },
  },
};

const splitRows = [column];
const splitColumns = [column];
const chartThemeFulfilled: RecursivePartial<Theme> = {
  barSeriesStyle: { displayValue: { fontFamily: 'Arial' } },
  lineSeriesStyle: { point: { fill: '#fff' } },
  axes: { axisTitle: { fill: '#000' } },
};
const linkLabelWithEnoughSpace = (visParams: PartitionVisParams) => ({
  maxCount: Number.POSITIVE_INFINITY,
  maximumSection: Number.POSITIVE_INFINITY,
  maxTextLength: visParams.labels.truncate ?? undefined,
});

const linkLabelsWithoutSpaceForOuterLabels = { maxCount: 0 };

const linkLabelsWithoutSpaceForLabels = {
  maxCount: 0,
  maximumSection: Number.POSITIVE_INFINITY,
};

const chartToPartitionLayout = {
  [ChartTypes.DONUT]: PartitionLayout.sunburst,
  [ChartTypes.PIE]: PartitionLayout.sunburst,
  [ChartTypes.WAFFLE]: PartitionLayout.waffle,
  [ChartTypes.TREEMAP]: PartitionLayout.treemap,
  [ChartTypes.MOSAIC]: PartitionLayout.mosaic,
};

const checkStaticConfigOptions = (config: RecursivePartial<PartitionConfig>) => {
  expect(config.minFontSize).toEqual(10);
  expect(config.maxFontSize).toEqual(16);
  expect(config.sectorLineWidth).toEqual(1.5);
  expect(config.circlePadding).toEqual(4);
  expect(config.linkLabel).not.toBeUndefined();
  expect(config.linkLabel).not.toBeNull();
  expect(typeof config.linkLabel).toEqual('object');
};

const checkLinkLabelEmptyTextColor = (config: RecursivePartial<PartitionConfig>) => {
  expect(config.linkLabel?.textColor).toBeUndefined();
};

const checkLinkLabel = (
  config: RecursivePartial<PartitionConfig>,
  visParams: PartitionVisParams
) => {
  expect(typeof config.linkLabel).toEqual('object');
  expect(config.linkLabel?.maxCount).toEqual(5);
  expect(config.linkLabel?.fontSize).toEqual(11);
  expect(config.linkLabel?.maxTextLength).toEqual(visParams.labels.truncate ?? undefined);
};

const checkDefaultLinkLabel = (
  config: RecursivePartial<PartitionConfig>,
  visParams: PartitionVisParams
) => {
  checkLinkLabel(config, visParams);
  checkLinkLabelEmptyTextColor(config);
};

const checkLinkLabelWithTextColor = (
  config: RecursivePartial<PartitionConfig>,
  visParams: PartitionVisParams,
  chartTheme: RecursivePartial<Theme>
) => {
  checkLinkLabel(config, visParams);
  expect(config.linkLabel?.textColor).toEqual(chartTheme.axes?.axisTitle?.fill);
};

const checkChartThemeRelatedFields = (
  config: RecursivePartial<PartitionConfig>,
  chartTheme: RecursivePartial<Theme>
) => {
  expect(config.fontFamily).toEqual(chartTheme.barSeriesStyle?.displayValue?.fontFamily);
  expect(config.sectorLineStroke).toEqual(chartTheme.lineSeriesStyle?.point?.fill);
  if (typeof config.linkLabel === 'object') {
    expect(config.linkLabel.textColor).toEqual(chartTheme.axes?.axisTitle?.fill);
  }
};

const checkDefaultConfigOptions = (
  config: RecursivePartial<PartitionConfig>,
  chartTheme: RecursivePartial<Theme>
) => {
  checkStaticConfigOptions(config);
  checkChartThemeRelatedFields(config, chartTheme);
};

const checkPartitionLayout = (chartType: ChartTypes, config: RecursivePartial<PartitionConfig>) => {
  expect(config.partitionLayout).toEqual(chartToPartitionLayout[chartType]);
};

const runPieDonutWaffleTestSuites = (chartType: ChartTypes) => {
  const visParams = createMockPieParams();
  const chartTheme = {};
  const dimensions = undefined;

  const vParamsSplitRows = {
    ...visParams,
    dimensions: { ...visParams.dimensions, splitRow: splitRows },
  };
  const vParamsSplitColumns = {
    ...visParams,
    dimensions: { ...visParams.dimensions, splitColumn: splitColumns },
  };

  it('should return correct default config options', () => {
    const config = getConfig(chartType, visParams, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    checkDefaultLinkLabel(config, visParams);
  });

  it('should not return margin configuration if dimensions are not specified', () => {
    const config = getConfig(chartType, visParams, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    checkDefaultLinkLabel(config, visParams);
    expect(config.margin).toBeUndefined();
  });

  it('should not return margin configuration if split column or row are specified', () => {
    const configForSplitColumns = getConfig(chartType, vParamsSplitColumns, chartTheme, dimensions);

    checkPartitionLayout(chartType, configForSplitColumns);
    checkDefaultConfigOptions(configForSplitColumns, chartTheme);
    expect(configForSplitColumns.margin).toBeUndefined();

    const configForSplitRows = getConfig(chartType, vParamsSplitRows, chartTheme, dimensions);

    checkDefaultConfigOptions(configForSplitRows, chartTheme);
    expect(configForSplitRows.margin).toBeUndefined();
  });

  it('should return adjusted margin configuration if dimensions are specified', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const config = getConfig(chartType, visParams, chartTheme, specifiedDimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    checkDefaultLinkLabel(config, visParams);
    expect(config.margin).toEqual({ top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 });
  });

  it('should return right configuration for the theme related fields', () => {
    const config = getConfig(chartType, visParams, chartThemeFulfilled, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartThemeFulfilled);
    checkLinkLabelWithTextColor(config, visParams, chartThemeFulfilled);
  });

  it('should return undefined outerSizeRatio for split chart and show labels', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const config = getConfig(chartType, vParamsSplitRows, chartTheme, specifiedDimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    expect(config.outerSizeRatio).toBeUndefined();

    const configForSplitColumns = getConfig(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      specifiedDimensions
    );

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(configForSplitColumns, chartTheme);
    expect(configForSplitColumns.outerSizeRatio).toBeUndefined();
  });

  it(
    'should return undefined outerSizeRatio for not specified dimensions, visible labels,' +
      'and default labels position and not split chart',
    () => {
      const config = getConfig(chartType, visParams, chartTheme, dimensions);

      checkPartitionLayout(chartType, config);
      checkDefaultConfigOptions(config, chartTheme);
      checkDefaultLinkLabel(config, visParams);
      expect(config.outerSizeRatio).toBeUndefined();
    }
  );

  it(
    'should return rescaleFactor value for outerSizeRatio if dimensions are specified,' +
      ' is not split chart, labels are shown and labels position is not `inside`',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const rescaleFactor = 2;
      const config = getConfig(
        chartType,
        visParams,
        chartTheme,
        specifiedDimensions,
        rescaleFactor
      );

      checkPartitionLayout(chartType, config);
      checkDefaultConfigOptions(config, chartTheme);
      checkDefaultLinkLabel(config, visParams);
      expect(config.outerSizeRatio).toBe(rescaleFactor);
    }
  );
  it(
    'should return adjusted rescaleFactor for outerSizeRatio if dimensions are specified,' +
      ' is not split chart, labels position is `inside` and labels are shown',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const rescaleFactor = 1;
      const config = getConfig(
        chartType,
        {
          ...visParams,
          labels: { ...visParams.labels, position: LabelPositions.INSIDE },
        },
        chartTheme,
        specifiedDimensions,
        rescaleFactor
      );

      checkPartitionLayout(chartType, config);
      checkDefaultConfigOptions(config, chartTheme);
      expect(config.outerSizeRatio).toBe(0.5);
    }
  );
  it(
    'should return linkLabel with enough space if labels are shown,' +
      ' labels position is `default` and need to show the last level only.',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const vParams = {
        ...visParams,
        labels: { ...visParams.labels, lastLevel: true },
      };
      const config = getConfig(chartType, vParams, chartTheme, specifiedDimensions);

      checkPartitionLayout(chartType, config);
      checkDefaultConfigOptions(config, chartTheme);
      expect(config.linkLabel).toEqual(linkLabelWithEnoughSpace(vParams));
    }
  );

  it('should hide links if position is `inside` or is split chart, and labels are shown', () => {
    const vParams = {
      ...visParams,
      labels: { ...visParams.labels, position: LabelPositions.INSIDE },
    };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    expect(config.linkLabel).toEqual(linkLabelsWithoutSpaceForOuterLabels);

    const configSplitColumns = getConfig(chartType, vParamsSplitColumns, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(configSplitColumns, chartTheme);
    expect(configSplitColumns.linkLabel).toEqual(linkLabelsWithoutSpaceForOuterLabels);

    const configSplitRows = getConfig(chartType, vParamsSplitRows, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(configSplitRows, chartTheme);
    expect(configSplitRows.linkLabel).toEqual(linkLabelsWithoutSpaceForOuterLabels);
  });

  it('should hide links if labels are not shown', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    expect(config.linkLabel).toEqual(linkLabelsWithoutSpaceForLabels);
  });

  it('should be able to enable specialFirstInnermostSector mode', () => {
    const vParams = {
      ...visParams,
      startFromSecondLargestSlice: true,
    };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    checkPartitionLayout(chartType, config);
    checkDefaultConfigOptions(config, chartTheme);
    checkDefaultLinkLabel(config, vParams);
    expect(config.specialFirstInnermostSector).toEqual(vParams.startFromSecondLargestSlice);
  });
};

describe('Pie getConfig', () => {
  runPieDonutWaffleTestSuites(ChartTypes.PIE);
});

describe('Donut getConfig', () => {
  runPieDonutWaffleTestSuites(ChartTypes.DONUT);
});

describe('Waffle getConfig', () => {
  runPieDonutWaffleTestSuites(ChartTypes.WAFFLE);
});

describe('Mosaic getConfig', () => {
  it('', () => {});
});

describe('Treemap getConfig', () => {
  it('', () => {});
});
