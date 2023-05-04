/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getPartitionTheme } from './get_partition_theme';
import { createMockPieParams, createMockDonutParams, createMockPartitionVisParams } from '../mocks';
import { ChartTypes, LabelPositions, PartitionVisParams } from '../../common/types';
import { RecursivePartial } from '@elastic/eui';
import { Theme } from '@elastic/charts';

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

const getStaticThemePartition = (
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
});

const getStaticThemeOptions = (theme: RecursivePartial<Theme>, visParams: PartitionVisParams) => ({
  partition: getStaticThemePartition(theme, visParams),
  chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
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

  it('should return correct default theme options', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        outerSizeRatio: undefined,
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should not return padding settings if dimensions are not specified', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        outerSizeRatio: undefined,
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should not return padding settings if split column or row are specified', () => {
    const themeForSplitColumns = getPartitionTheme(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      dimensions
    );

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });

    const themeForSplitRows = getPartitionTheme(
      chartType,
      vParamsSplitRows,
      chartTheme,
      dimensions
    );

    expect(themeForSplitRows).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });
  });

  it('should return adjusted padding settings if dimensions are specified', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, visParams, chartTheme, specifiedDimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should return right settings for the theme related fields', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        outerSizeRatio: undefined,
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should return undefined outerSizeRatio for split chart and show labels', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, vParamsSplitRows, chartTheme, specifiedDimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });

    const themeForSplitColumns = getPartitionTheme(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      specifiedDimensions
    );

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });
  });

  it(
    'should return undefined outerSizeRatio for not specified dimensions, visible labels,' +
      'and default labels position and not split chart',
    () => {
      const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);

      expect(theme).toEqual({
        ...getStaticThemeOptions(chartTheme, visParams),
        partition: {
          ...getStaticThemePartition(chartTheme, visParams),
          outerSizeRatio: undefined,
          linkLabel: getDefaultLinkLabel(visParams, chartTheme),
        },
      });
    }
  );

  it(
    'should return rescaleFactor value for outerSizeRatio if dimensions are specified,' +
      ' is not split chart, labels are shown and labels position is not `inside`',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const rescaleFactor = 2;
      const theme = getPartitionTheme(
        chartType,
        visParams,
        chartTheme,
        specifiedDimensions,
        rescaleFactor
      );

      expect(theme).toEqual({
        ...getStaticThemeOptions(chartTheme, visParams),
        chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
        partition: {
          ...getStaticThemePartition(chartTheme, visParams),
          outerSizeRatio: rescaleFactor,
          linkLabel: getDefaultLinkLabel(visParams, chartTheme),
        },
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

      const theme = getPartitionTheme(
        chartType,
        vParams,
        chartTheme,
        specifiedDimensions,
        rescaleFactor
      );

      expect(theme).toEqual({
        ...getStaticThemeOptions(chartTheme, vParams),
        chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
        partition: {
          ...getStaticThemePartition(chartTheme, vParams),
          outerSizeRatio: 0.5,
          linkLabel: linkLabelsWithoutSpaceForOuterLabels,
        },
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
        labels: { ...visParams.labels, last_level: true },
      };
      const theme = getPartitionTheme(chartType, vParams, chartTheme, specifiedDimensions);

      expect(theme).toEqual({
        ...getStaticThemeOptions(chartTheme, vParams),
        chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
        partition: {
          ...getStaticThemePartition(chartTheme, vParams),
          linkLabel: linkLabelWithEnoughSpace(vParams),
        },
      });
    }
  );

  it('should hide links if position is `inside` or is split chart, and labels are shown', () => {
    const vParams = {
      ...visParams,
      labels: { ...visParams.labels, position: LabelPositions.INSIDE },
    };
    const theme = getPartitionTheme(chartType, vParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, vParams),
      partition: {
        ...getStaticThemePartition(chartTheme, vParams),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });

    const themeSplitColumns = getPartitionTheme(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      dimensions
    );

    expect(themeSplitColumns).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });

    const themeSplitRows = getPartitionTheme(chartType, vParamsSplitRows, chartTheme, dimensions);

    expect(themeSplitRows).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels,
      },
    });
  });

  it('should hide links if labels are not shown', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const theme = getPartitionTheme(chartType, vParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, vParams),
      partition: {
        ...getStaticThemePartition(chartTheme, vParams),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForLabels,
      },
    });
  });
};

const runTreemapMosaicTestSuites = (chartType: ChartTypes, visParams: PartitionVisParams) => {
  const vParamsSplitRows = {
    ...visParams,
    dimensions: { ...visParams.dimensions, splitRow: splitRows },
  };
  const vParamsSplitColumns = {
    ...visParams,
    dimensions: { ...visParams.dimensions, splitColumn: splitColumns },
  };

  it('should return correct theme options', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should return empty padding settings if dimensions are not specified', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should return padding settings if split column or row are specified', () => {
    const themeForSplitColumns = getPartitionTheme(
      chartType,
      vParamsSplitColumns,
      chartTheme,
      dimensions
    );

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitColumns),
        linkLabel: getDefaultLinkLabel(vParamsSplitColumns, chartTheme),
      },
    });

    const themeForSplitRows = getPartitionTheme(
      chartType,
      vParamsSplitRows,
      chartTheme,
      dimensions
    );

    expect(themeForSplitRows).toEqual({
      ...getStaticThemeOptions(chartTheme, vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(chartTheme, vParamsSplitRows),
        linkLabel: getDefaultLinkLabel(vParamsSplitRows, chartTheme),
      },
    });
  });

  it('should return fullfilled padding settings if dimensions are specified', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, visParams, chartTheme, specifiedDimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should return settings for the theme related fields', () => {
    const theme = getPartitionTheme(chartType, visParams, chartTheme, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
      },
    });
  });

  it('should make color transparent if labels are hidden', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const theme = getPartitionTheme(chartType, vParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, vParams),
      partition: {
        ...getStaticThemePartition(chartTheme, vParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
        fillLabel: { textColor: 'rgba(0,0,0,0)' },
      },
    });
  });
};

describe('Pie getPartitionTheme', () => {
  runPieDonutWaffleTestSuites(ChartTypes.PIE, createMockPieParams());
});

describe('Donut getPartitionTheme', () => {
  const visParams = createMockDonutParams();
  const chartType = ChartTypes.DONUT;

  runPieDonutWaffleTestSuites(chartType, visParams);

  it('should return correct empty size ratio and partitionLayout', () => {
    const theme = getPartitionTheme(ChartTypes.DONUT, visParams, chartTheme, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(chartTheme, visParams),
      outerSizeRatio: undefined,
      partition: {
        ...getStaticThemePartition(chartTheme, visParams),
        linkLabel: getDefaultLinkLabel(visParams, chartTheme),
        outerSizeRatio: undefined,
      },
    });
  });
});

describe('Waffle getPartitionTheme', () => {
  runPieDonutWaffleTestSuites(ChartTypes.WAFFLE, createMockPartitionVisParams());
});

describe('Mosaic getPartitionTheme', () => {
  runTreemapMosaicTestSuites(ChartTypes.MOSAIC, createMockPartitionVisParams());
});

describe('Treemap getPartitionTheme', () => {
  runTreemapMosaicTestSuites(ChartTypes.TREEMAP, createMockPartitionVisParams());
});
