/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';
import { getPartitionTheme } from './get_partition_theme';
import { createMockPieParams, createMockDonutParams, createMockPartitionVisParams } from '../mocks';
import { ChartTypes, LabelPositions, PartitionVisParams } from '../../common/types';

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

const linkLabelWithEnoughSpace = (visParams: PartitionVisParams) => ({
  maxCount: Number.POSITIVE_INFINITY,
  maximumSection: Number.POSITIVE_INFINITY,
  maxTextLength: visParams.labels.truncate ?? undefined,
});

const linkLabelsWithoutSpaceForOuterLabels = (visParams: PartitionVisParams) => ({
  maxCount: 0,
  maxTextLength: visParams.labels.truncate ?? undefined,
});

const linkLabelsWithoutSpaceForLabels = (visParams: PartitionVisParams) => ({
  maxCount: 0,
  maximumSection: Number.POSITIVE_INFINITY,
  maxTextLength: visParams.labels.truncate ?? undefined,
});

const getStaticThemePartition = (visParams: PartitionVisParams) => ({
  outerSizeRatio: 1,
  minFontSize: 10,
  maxFontSize: 16,
  emptySizeRatio: visParams.emptySizeRatio ?? 0,
  sectorLineWidth: 1.5,
  circlePadding: 4,
});

const getStaticThemeOptions = (visParams: PartitionVisParams) => ({
  partition: getStaticThemePartition(visParams),
  chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
});

const getDefaultLinkLabel = (visParams: PartitionVisParams) => ({
  maxCount: 5,
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

  it('should not return padding settings if split column or row are specified', () => {
    const themeForSplitColumns = getPartitionTheme(chartType, vParamsSplitColumns, dimensions);

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitColumns),
      },
    });

    const themeForSplitRows = getPartitionTheme(chartType, vParamsSplitRows, dimensions);

    expect(themeForSplitRows).toEqual({
      ...getStaticThemeOptions(vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitRows),
      },
    });
  });

  it('should return adjusted padding settings if dimensions are specified and is on aggBased editor', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, visParams, specifiedDimensions, undefined, true);

    expect(theme).toEqual({
      ...getStaticThemeOptions(visParams),
      chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
      partition: {
        ...getStaticThemePartition(visParams),
        linkLabel: getDefaultLinkLabel(visParams),
      },
    });
  });

  it('should return right settings for the theme related fields', () => {
    const theme = getPartitionTheme(chartType, visParams, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(visParams),
      partition: {
        ...getStaticThemePartition(visParams),
        outerSizeRatio: undefined,
        linkLabel: getDefaultLinkLabel(visParams),
      },
    });
  });

  it('should return undefined outerSizeRatio for split chart and show labels', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, vParamsSplitRows, specifiedDimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitRows),
      },
    });

    const themeForSplitColumns = getPartitionTheme(
      chartType,
      vParamsSplitColumns,
      specifiedDimensions
    );

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitColumns),
      },
    });
  });

  it(
    'should return rescaleFactor value for outerSizeRatio if dimensions are specified,' +
      ' is not split chart, labels are shown and labels position is not `inside`',
    () => {
      const specifiedDimensions = { width: 2000, height: 2000 };
      const rescaleFactor = 2;
      const theme = getPartitionTheme(chartType, visParams, specifiedDimensions, rescaleFactor);

      expect(theme).toEqual({
        ...getStaticThemeOptions(visParams),
        partition: {
          ...getStaticThemePartition(visParams),
          outerSizeRatio: rescaleFactor,
          linkLabel: getDefaultLinkLabel(visParams),
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

      const theme = getPartitionTheme(chartType, vParams, specifiedDimensions, rescaleFactor);

      expect(theme).toEqual({
        ...getStaticThemeOptions(vParams),
        partition: {
          ...getStaticThemePartition(vParams),
          outerSizeRatio: 0.5,
          linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParams),
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
      const theme = getPartitionTheme(chartType, vParams, specifiedDimensions);

      expect(theme).toEqual({
        ...getStaticThemeOptions(vParams),
        partition: {
          ...getStaticThemePartition(vParams),
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
    const theme = getPartitionTheme(chartType, vParams, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(vParams),
      partition: {
        ...getStaticThemePartition(vParams),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParams),
      },
    });

    const themeSplitColumns = getPartitionTheme(chartType, vParamsSplitColumns, dimensions);

    expect(themeSplitColumns).toEqual({
      ...getStaticThemeOptions(vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(vParamsSplitColumns),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitColumns),
      },
    });

    const themeSplitRows = getPartitionTheme(chartType, vParamsSplitRows, dimensions);

    expect(themeSplitRows).toEqual({
      ...getStaticThemeOptions(vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(vParamsSplitRows),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForOuterLabels(vParamsSplitRows),
      },
    });
  });

  it('should hide links if labels are not shown', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const theme = getPartitionTheme(chartType, vParams, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(vParams),
      partition: {
        ...getStaticThemePartition(vParams),
        outerSizeRatio: undefined,
        linkLabel: linkLabelsWithoutSpaceForLabels(vParams),
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
    const theme = getPartitionTheme(chartType, visParams, dimensions);
    expect(theme).toEqual({
      ...getStaticThemeOptions(visParams),
      partition: {
        ...getStaticThemePartition(visParams),
        linkLabel: getDefaultLinkLabel(visParams),
      },
    });
  });

  it('should return padding settings if split column or row are specified', () => {
    const themeForSplitColumns = getPartitionTheme(chartType, vParamsSplitColumns, dimensions);

    expect(themeForSplitColumns).toEqual({
      ...getStaticThemeOptions(vParamsSplitColumns),
      partition: {
        ...getStaticThemePartition(vParamsSplitColumns),
        linkLabel: getDefaultLinkLabel(vParamsSplitColumns),
      },
    });

    const themeForSplitRows = getPartitionTheme(chartType, vParamsSplitRows, dimensions);

    expect(themeForSplitRows).toEqual({
      ...getStaticThemeOptions(vParamsSplitRows),
      partition: {
        ...getStaticThemePartition(vParamsSplitRows),
        linkLabel: getDefaultLinkLabel(vParamsSplitRows),
      },
    });
  });

  it('should return fullfilled padding settings if dimensions are specified', () => {
    const specifiedDimensions = { width: 2000, height: 2000 };
    const theme = getPartitionTheme(chartType, visParams, specifiedDimensions, undefined, true);

    expect(theme).toEqual({
      ...getStaticThemeOptions(visParams),
      chartPaddings: { top: 500, bottom: 500, left: 500, right: 500 },
      partition: {
        ...getStaticThemePartition(visParams),
        linkLabel: getDefaultLinkLabel(visParams),
      },
    });
  });

  it('should make color transparent if labels are hidden', () => {
    const vParams = { ...visParams, labels: { ...visParams.labels, show: false } };
    const theme = getPartitionTheme(chartType, vParams, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(vParams),
      partition: {
        ...getStaticThemePartition(vParams),
        linkLabel: getDefaultLinkLabel(visParams),
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
    const theme = getPartitionTheme(ChartTypes.DONUT, visParams, dimensions);

    expect(theme).toEqual({
      ...getStaticThemeOptions(visParams),
      outerSizeRatio: undefined,
      partition: {
        ...getStaticThemePartition(visParams),
        linkLabel: getDefaultLinkLabel(visParams),
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
