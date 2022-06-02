/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Tooltip } from './tooltip';
import { generateSeriesId, LayersAccessorsTitles, LayersFieldFormats } from '../../helpers';
import { XYChartSeriesIdentifier } from '@elastic/charts';
import { sampleArgs, sampleLayer } from '../../../common/__mocks__';
import { FieldFormat, FormatFactory } from '@kbn/field-formats-plugin/common';

const getSeriesIdentifier = ({
  layerId,
  xAccessor,
  yAccessor,
  splitAccessor,
  splitRowAccessor,
  splitColumnAccessor,
  splitAccessors,
}: {
  layerId: string;
  xAccessor?: string;
  yAccessor?: string;
  splitRowAccessor?: string;
  splitAccessor?: string;
  splitColumnAccessor?: string;
  splitAccessors: Map<number | string, number | string>;
}): XYChartSeriesIdentifier => ({
  specId: generateSeriesId({ layerId, xAccessor, splitAccessor }, yAccessor),
  yAccessor: yAccessor ?? 'a',
  splitAccessors,
  seriesKeys: [],
  key: '1',
  smVerticalAccessorValue: splitColumnAccessor,
  smHorizontalAccessorValue: splitRowAccessor,
});

describe('Tooltip', () => {
  const { data } = sampleArgs();
  const { layerId, xAccessor, splitAccessor, accessors } = sampleLayer;
  const splitAccessors = new Map();
  splitAccessors.set(splitAccessor, '10');

  const accessor = accessors[0] as string;
  const splitRowAccessor = 'd';
  const splitColumnAccessor = 'd';

  const seriesIdentifier = getSeriesIdentifier({
    layerId,
    yAccessor: accessor,
    xAccessor: xAccessor as string,
    splitAccessor: splitAccessor as string,
    splitAccessors,
    splitRowAccessor,
    splitColumnAccessor,
  });

  const header = {
    value: 'some value',
    label: 'some label',
    formattedValue: 'formatted value',
    color: '#fff',
    isHighlighted: true,
    isVisible: true,
    seriesIdentifier,
  };

  const titles: LayersAccessorsTitles = {
    [layerId]: {
      xTitles: { [xAccessor as string]: 'x-title' },
      yTitles: { [accessor]: 'y-title' },
      splitSeriesTitles: { [splitAccessor as string]: 'split-series-title' },
      splitRowTitles: { [splitRowAccessor]: 'split-row-title' },
      splitColumnTitles: { [splitColumnAccessor]: 'split-column-title' },
    },
  };

  const fieldFormats: LayersFieldFormats = {
    [layerId]: {
      xAccessors: { [xAccessor as string]: { id: 'number' } },
      yAccessors: { [accessor]: { id: 'string' } },
      splitSeriesAccessors: { [splitAccessor as string]: { id: 'date' } },
      splitRowAccessors: { [splitRowAccessor]: { id: 'number' } },
      splitColumnAccessors: { [splitColumnAccessor]: { id: 'number' } },
    },
  };

  const formatFactory: FormatFactory = (format) =>
    ({
      convert: (value) => `formatted-${format?.id}-${value}`,
    } as FieldFormat);

  it('should render plain tooltip', () => {
    const tooltip = shallow(
      <Tooltip
        header={header}
        values={[header]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });

  it('should render tooltip with xDomain', () => {
    const headerWithValue = { ...header, value: 10 };
    const xDomain = { min: 0, max: 1000 };

    const tooltip = shallow(
      <Tooltip
        header={headerWithValue}
        values={[headerWithValue]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
        xDomain={xDomain}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });

  it('should render tooltip with partial buckets', () => {
    const headerWithValue = { ...header, value: 10 };
    const xDomain = { min: 15, max: 1000 };

    const tooltip = shallow(
      <Tooltip
        header={headerWithValue}
        values={[headerWithValue]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
        xDomain={xDomain}
      />
    );

    expect(tooltip).toMatchSnapshot();

    const xDomain2 = { min: 5, max: 1000, minInterval: 995 };

    const tooltip2 = shallow(
      <Tooltip
        header={headerWithValue}
        values={[headerWithValue]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
        xDomain={xDomain2}
      />
    );

    expect(tooltip2).toMatchSnapshot();
  });

  it('should render tooltip without x-value', () => {
    const value = { ...header, value: 10 };

    const tooltip = shallow(
      <Tooltip
        header={null}
        values={[value]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();

    const seriesIdentifierWithoutX = getSeriesIdentifier({
      layerId,
      yAccessor: accessor,
      splitAccessor: splitAccessor as string,
      splitAccessors,
      splitRowAccessor,
      splitColumnAccessor,
    });

    const value2 = { ...header, value: 10, seriesIdentifier: seriesIdentifierWithoutX };

    const tooltip2 = shallow(
      <Tooltip
        header={value2}
        values={[value2]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
      />
    );

    expect(tooltip2).toMatchSnapshot();
  });

  it('should render tooltip without y-value', () => {
    const seriesIdentifierWithoutY = getSeriesIdentifier({
      layerId,
      xAccessor: xAccessor as string,
      splitAccessor: splitAccessor as string,
      splitAccessors,
      splitRowAccessor,
      splitColumnAccessor,
    });

    const value = { ...header, value: 10, seriesIdentifier: seriesIdentifierWithoutY };

    const tooltip = shallow(
      <Tooltip
        header={value}
        values={[value]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });

  it('should render tooltip without splitAccessors-values', () => {
    const seriesIdentifierWithoutSplitAccessors = getSeriesIdentifier({
      layerId,
      xAccessor: xAccessor as string,
      yAccessor: accessor,
      splitAccessors: new Map(),
      splitRowAccessor,
      splitColumnAccessor,
    });

    const value = { ...header, value: 10, seriesIdentifier: seriesIdentifierWithoutSplitAccessors };

    const tooltip = shallow(
      <Tooltip
        header={value}
        values={[value]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor, splitRowAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });

  it('should render tooltip without split-row-values', () => {
    const seriesIdentifierWithoutSplitRow = getSeriesIdentifier({
      layerId,
      xAccessor: xAccessor as string,
      yAccessor: accessor,
      splitAccessor: splitAccessor as string,
      splitAccessors,
      splitColumnAccessor,
    });

    const value = { ...header, value: 10, seriesIdentifier: seriesIdentifierWithoutSplitRow };

    const tooltip = shallow(
      <Tooltip
        header={value}
        values={[value]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitColumnAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });

  it('should render tooltip without split-column-values', () => {
    const seriesIdentifierWithoutSplitColumn = getSeriesIdentifier({
      layerId,
      xAccessor: xAccessor as string,
      yAccessor: accessor,
      splitAccessor: splitAccessor as string,
      splitAccessors,
      splitRowAccessor,
    });

    const value = { ...header, value: 10, seriesIdentifier: seriesIdentifierWithoutSplitColumn };

    const tooltip = shallow(
      <Tooltip
        header={value}
        values={[value]}
        fieldFormats={fieldFormats}
        titles={titles}
        formatFactory={formatFactory}
        formattedDatatables={{ [layerId]: { table: data, formattedColumns: {} } }}
        splitAccessors={{ splitRowAccessor }}
      />
    );

    expect(tooltip).toMatchSnapshot();
  });
});
