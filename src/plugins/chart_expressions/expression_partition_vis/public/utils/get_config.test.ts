/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '../../../../visualizations/common';
import { getConfig } from './get_config';
import { createMockPieParams, createMockDonutParams } from '../mocks';
import { ChartTypes, LabelPositions, PartitionVisParams } from '../../common/types';
import { RecursivePartial } from '@elastic/eui';
import { Chart, PartitionLayout, Theme } from '@elastic/charts';

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
const chartTheme: RecursivePartial<Theme> = {
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

const getStaticConfigOptions = (
  chartType: ChartTypes,
  theme: RecursivePartial<Theme>,
  visParams: PartitionVisParams
) => ({
  fontFamily: theme.barSeriesStyle?.displayValue?.fontFamily,
  outerSizeRatio: 1,
  minFontSize: 10,
  maxFontSize: 16,
  emptySizeRatio: visParams.emptySizeRatio ?? 0,
  sectorLineStroke: theme.lineSeriesStyle?.point?.fill,
  sectorLineWidth: 1.5,
  circlePadding: 4,
  margin: undefined,
  partitionLayout: chartToPartitionLayout[chartType],
});

const getDefaultLinkLabel = (visParams: PartitionVisParams, theme: RecursivePartial<Theme>) => ({
  maxCount: 5,
  fontSize: 11,
  textColor: theme.axes?.axisTitle?.fill,
  maxTextLength: visParams.labels.truncate ?? undefined,
});

const dimensions = undefined;

const runPieDonutWaffleTestSuites = (chartType: ChartTypes, visParams: PartitionVisParams) => {
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
    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
    });
  });

  it('should not return margin configuration if dimensions are not specified', () => {
    const config = getConfig(chartType, visParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
    });
  });

  it('should not return margin configuration if split column or row are specified', () => {
    const configForSplitColumns = getConfig(chartType, vParamsSplitColumns, chartTheme, dimensions);

    expect(configForSplitColumns).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParamsSplitColumns),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });

    const configForSplitRows = getConfig(chartType, vParamsSplitRows, chartTheme, dimensions);

    expect(configForSplitRows).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParamsSplitRows),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });
  });

  it('should return adjusted margin configuration if dimensions are specified', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const config = getConfig(chartType, visParams, chartTheme, specifiedDimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      margin: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
    });
  });

  it('should return right configuration for the theme related fields', () => {
    const config = getConfig(chartType, visParams, chartTheme, dimensions);
    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
    });
  });

  it('should return undefined outerSizeRatio for split chart and show labels', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const config = getConfig(chartType, vParamsSplitRows, chartTheme, specifiedDimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });

    const configForSplitColumns = getConfig(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      specifiedDimensions
    );

    expect(configForSplitColumns).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParamsSplitColumns),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });
  });

  it(
    'should return undefined outerSizeRatio for not specified dimensions, visible labels,' +
      'and default labels position and not split chart',
    () => {
      const config = getConfig(chartType, visParams, chartTheme, dimensions);

      expect(config).toEqual({
        ...getStaticConfigOptions(chartType, chartTheme, visParams),
        outerSizeRatio: undefined,
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      });
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

      expect(config).toEqual({
        ...getStaticConfigOptions(chartType, chartTheme, visParams),
        outerSizeRatio: rescaleFactor,
        margin: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      });
    }
  );
  it(
    'should return adjusted rescaleFactor for outerSizeRatio if dimensions are specified,' +
      ' is not split chart, labels position is `inside` and labels are shown',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const rescaleFactor = 1;
      const vParams = {
        ...visParams,
        labels: { ...visParams.labels, position: LabelPositions.INSIDE },
      };

      const config = getConfig(chartType, vParams, chartTheme, specifiedDimensions, rescaleFactor);

      expect(config).toEqual({
        ...getStaticConfigOptions(chartType, chartTheme, vParams),
        outerSizeRatio: 0.5,
        margin: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      });
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

      expect(config).toEqual({
        ...getStaticConfigOptions(chartType, chartTheme, vParams),
        margin: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
        linkLabel: linkLabelWithEnoughSpace(vParams),
      });
    }
  );

  it('should hide links if position is `inside` or is split chart, and labels are shown', () => {
    const vParams = {
      ...visParams,
      labels: { ...visParams.labels, position: LabelPositions.INSIDE },
    };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParams),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });

    const configSplitColumns = getConfig(chartType, vParamsSplitColumns, chartTheme, dimensions);

    expect(configSplitColumns).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParamsSplitColumns),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });

    const configSplitRows = getConfig(chartType, vParamsSplitRows, chartTheme, dimensions);

    expect(configSplitRows).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParamsSplitRows),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForOuterLabels,
    });
  });

  it('should hide links if labels are not shown', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParams),
      outerSizeRatio: undefined,
      linkLabel: linkLabelsWithoutSpaceForLabels,
    });
  });
};

describe('Pie getConfig', () => {
  const visParams = createMockPieParams();
  const chartType = ChartTypes.PIE;
  runPieDonutWaffleTestSuites(chartType, visParams);

  it('should be able to enable specialFirstInnermostSector mode', () => {
    const vParams = {
      ...visParams,
      startFromSecondLargestSlice: true,
    };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      specialFirstInnermostSector: vParams.startFromSecondLargestSlice,
    });
  });
});

describe('Donut getConfig', () => {
  const visParams = createMockDonutParams();
  const chartType = ChartTypes.DONUT;

  runPieDonutWaffleTestSuites(chartType, visParams);

  it('should return correct empty size ratio and partitionLayout', () => {
    const config = getConfig(ChartTypes.DONUT, visParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, visParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
    });
  });

  it('should be able to enable specialFirstInnermostSector mode', () => {
    const vParams = {
      ...visParams,
      startFromSecondLargestSlice: true,
    };
    const config = getConfig(chartType, vParams, chartTheme, dimensions);

    expect(config).toEqual({
      ...getStaticConfigOptions(chartType, chartTheme, vParams),
      outerSizeRatio: undefined,
      linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      specialFirstInnermostSector: vParams.startFromSecondLargestSlice,
    });
  });
});

describe('Waffle getConfig', () => {
  runPieDonutWaffleTestSuites(ChartTypes.WAFFLE, createMockPieParams());
});

describe('Mosaic getConfig', () => {
  it('', () => {});
});

describe('Treemap getConfig', () => {
  it('', () => {});
});
