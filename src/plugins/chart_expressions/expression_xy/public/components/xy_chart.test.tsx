/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import {
  AreaSeries,
  Axis,
  BarSeries,
  Fit,
  GeometryValue,
  HorizontalAlignment,
  LayoutDirection,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  SeriesNameFn,
  Settings,
  VerticalAlignment,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { Datatable } from '@kbn/expressions-plugin/common';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { eventAnnotationServiceMock } from '@kbn/event-annotation-plugin/public/mocks';
import { EventAnnotationOutput } from '@kbn/event-annotation-plugin/common';
import { CommonXYAnnotationLayerConfigResult, DataLayerConfigResult } from '../../common';
import { LayerTypes } from '../../common/constants';
import { XyEndzones } from './x_domain';
import {
  chartsActiveCursorService,
  chartsThemeService,
  dateHistogramData,
  dateHistogramLayer,
  paletteService,
  sampleArgsWithReferenceLine,
} from '../__mocks__';
import {
  mockPaletteOutput,
  sampleArgs,
  createArgsWithLayers,
  createSampleDatatableWithRows,
  sampleLayer,
} from '../../common/__mocks__';
import { XYChart, XYChartRenderProps } from './xy_chart';
import { ExtendedDataLayerConfigResult, XYChartProps, XYProps } from '../../common/types';
import { DataLayers } from './data_layers';

const onClickValue = jest.fn();
const onSelectRange = jest.fn();

describe('XYChart component', () => {
  let getFormatSpy: jest.Mock;
  let convertSpy: jest.Mock;
  let defaultProps: Omit<XYChartRenderProps, 'data' | 'args'>;

  const dataWithoutFormats: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'a', name: 'a', meta: { type: 'number' } },
      { id: 'b', name: 'b', meta: { type: 'number' } },
      { id: 'c', name: 'c', meta: { type: 'string' } },
      { id: 'd', name: 'd', meta: { type: 'string' } },
    ],
    rows: [
      { a: 1, b: 2, c: 'I', d: 'Row 1' },
      { a: 1, b: 5, c: 'J', d: 'Row 2' },
    ],
  };

  const dataWithFormats: Datatable = {
    type: 'datatable',
    columns: [
      { id: 'a', name: 'a', meta: { type: 'number' } },
      { id: 'b', name: 'b', meta: { type: 'number' } },
      { id: 'c', name: 'c', meta: { type: 'string' } },
      { id: 'd', name: 'd', meta: { type: 'string', params: { id: 'custom' } } },
    ],
    rows: [
      { a: 1, b: 2, c: 'I', d: 'Row 1' },
      { a: 1, b: 5, c: 'J', d: 'Row 2' },
    ],
  };

  const getRenderedComponent = (args: XYProps) => {
    return shallow(<XYChart {...defaultProps} args={args} />);
  };

  beforeEach(() => {
    convertSpy = jest.fn((x) => x);
    getFormatSpy = jest.fn();
    getFormatSpy.mockReturnValue({ convert: convertSpy });

    defaultProps = {
      formatFactory: getFormatSpy,
      timeZone: 'UTC',
      renderMode: 'view',
      chartsThemeService,
      chartsActiveCursorService,
      paletteService,
      minInterval: 50,
      onClickValue,
      onSelectRange,
      syncColors: false,
      useLegacyTimeAxis: false,
      eventAnnotationService: eventAnnotationServiceMock,
    };
  });

  test('it renders line', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'line' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    expect(lineSeries).toHaveLength(2);
    expect(lineSeries.at(0).prop('yAccessors')).toEqual(['a']);
    expect(lineSeries.at(1).prop('yAccessors')).toEqual(['b']);
  });

  describe('date range', () => {
    const { data, args } = sampleArgs();

    const timeSampleLayer: DataLayerConfigResult = {
      type: 'dataLayer',
      layerType: LayerTypes.DATA,
      seriesType: 'line',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      splitAccessor: 'd',
      columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
      xScaleType: 'time',
      yScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
      table: {
        ...data,
        columns: data.columns.map((c) =>
          c.id !== 'c'
            ? c
            : {
                ...c,
                meta: {
                  type: 'date',
                  source: 'esaggs',
                  sourceParams: {
                    type: 'date_histogram',
                    params: {},
                    appliedTimeRange: {
                      from: '2019-01-02T05:00:00.000Z',
                      to: '2019-01-03T05:00:00.000Z',
                    },
                  },
                },
              }
        ),
      },
    };

    const multiLayerArgs = createArgsWithLayers([
      timeSampleLayer,
      { ...timeSampleLayer, seriesType: 'bar', xScaleType: 'time' },
    ]);

    test('it uses the full date range', () => {
      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...args,
            layers: [
              {
                ...(args.layers[0] as DataLayerConfigResult),
                seriesType: 'line',
                xScaleType: 'time',
                table: timeSampleLayer.table,
              },
            ],
          }}
          minInterval={undefined}
        />
      );
      expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
        Object {
          "max": 1546491600000,
          "min": 1546405200000,
          "minInterval": undefined,
        }
      `);
    });

    test('it uses passed in minInterval', () => {
      const table1 = createSampleDatatableWithRows([{ a: 1, b: 2, c: 'I', d: 'Foo' }]);
      const table2 = createSampleDatatableWithRows([]);

      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...multiLayerArgs,
            layers: [
              { ...(multiLayerArgs.layers[0] as DataLayerConfigResult), table: table1 },
              { ...(multiLayerArgs.layers[1] as DataLayerConfigResult), table: table2 },
            ],
          }}
        />
      );

      // real auto interval is 30mins = 1800000
      expect(component.find(Settings).prop('xDomain')).toMatchInlineSnapshot(`
        Object {
          "max": NaN,
          "min": NaN,
          "minInterval": 50,
        }
      `);
    });

    describe('axis time', () => {
      const defaultTimeLayer: DataLayerConfigResult = {
        type: 'dataLayer',
        layerType: LayerTypes.DATA,
        seriesType: 'line',
        xAccessor: 'c',
        accessors: ['a', 'b'],
        splitAccessor: 'd',
        columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
        xScaleType: 'time',
        yScaleType: 'linear',
        isHistogram: true,
        palette: mockPaletteOutput,
        table: data,
      };

      const newData = {
        ...data,
        dateRange: {
          fromDate: new Date('2019-01-02T05:00:00.000Z'),
          toDate: new Date('2019-01-03T05:00:00.000Z'),
        },
      };

      test('it should disable the new time axis for a line time layer when isHistogram is set to false', () => {
        const instance = shallow(
          <XYChart
            {...defaultProps}
            args={{
              ...multiLayerArgs,
              layers: multiLayerArgs.layers.map((layer) => ({
                ...layer,
                table: newData,
              })),
            }}
          />
        );

        const axisStyle = instance.find(Axis).first().prop('timeAxisLayerCount');

        expect(axisStyle).toBe(0);
      });
      test('it should enable the new time axis for a line time layer when isHistogram is set to true', () => {
        const timeLayerArgs = createArgsWithLayers([defaultTimeLayer]);

        const instance = shallow(
          <XYChart
            {...defaultProps}
            args={{
              ...timeLayerArgs,
              layers: timeLayerArgs.layers.map((layer) => ({
                ...layer,
                table: newData,
              })),
            }}
          />
        );

        const axisStyle = instance.find(Axis).first().prop('timeAxisLayerCount');

        expect(axisStyle).toBe(3);
      });
      test('it should disable the new time axis for a vertical bar with break down dimension', () => {
        const timeLayer: DataLayerConfigResult = {
          ...defaultTimeLayer,
          seriesType: 'bar',
        };
        const timeLayerArgs = createArgsWithLayers([timeLayer]);

        const instance = shallow(
          <XYChart
            {...defaultProps}
            args={{
              ...timeLayerArgs,
              layers: timeLayerArgs.layers.map((layer) => ({
                ...layer,
                table: newData,
              })),
            }}
          />
        );

        const axisStyle = instance.find(Axis).first().prop('timeAxisLayerCount');

        expect(axisStyle).toBe(0);
      });

      test('it should enable the new time axis for a stacked vertical bar with break down dimension', () => {
        const timeLayer: DataLayerConfigResult = {
          ...defaultTimeLayer,
          seriesType: 'bar_stacked',
        };
        const timeLayerArgs = createArgsWithLayers([timeLayer]);

        const instance = shallow(
          <XYChart
            {...defaultProps}
            args={{
              ...timeLayerArgs,
              layers: timeLayerArgs.layers.map((layer) => ({
                ...layer,
                table: newData,
              })),
            }}
          />
        );

        const axisStyle = instance.find(Axis).first().prop('timeAxisLayerCount');

        expect(axisStyle).toBe(3);
      });
    });
    describe('endzones', () => {
      const table = createSampleDatatableWithRows([
        { a: 1, b: 2, c: new Date('2021-04-22').valueOf(), d: 'Foo' },
        { a: 1, b: 2, c: new Date('2021-04-23').valueOf(), d: 'Foo' },
        { a: 1, b: 2, c: new Date('2021-04-24').valueOf(), d: 'Foo' },
      ]);
      const newData = {
        ...table,
        type: 'datatable',

        columns: table.columns.map((c) =>
          c.id !== 'c'
            ? c
            : {
                ...c,
                meta: {
                  type: 'date',
                  source: 'esaggs',
                  sourceParams: {
                    type: 'date_histogram',
                    params: {},
                    appliedTimeRange: {
                      from: '2021-04-22T12:00:00.000Z',
                      to: '2021-04-24T12:00:00.000Z',
                    },
                  },
                },
              }
        ),
      };
      const timeArgs: XYProps = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            type: 'dataLayer',
            seriesType: 'line',
            xScaleType: 'time',
            isHistogram: true,
            splitAccessor: undefined,
            table: newData,
          } as DataLayerConfigResult,
        ],
      };

      test('it extends interval if data is exceeding it', () => {
        const component = shallow(
          <XYChart {...defaultProps} minInterval={24 * 60 * 60 * 1000} args={timeArgs} />
        );

        expect(component.find(Settings).prop('xDomain')).toEqual({
          // shortened to 24th midnight (elastic-charts automatically adds one min interval)
          max: new Date('2021-04-24').valueOf(),
          // extended to 22nd midnight because of first bucket
          min: new Date('2021-04-22').valueOf(),
          minInterval: 24 * 60 * 60 * 1000,
        });
      });

      const defaultTimeArgs = {
        ...timeArgs,
        layers: timeArgs.layers.map((layer) => ({
          ...layer,
          table: data,
        })),
      };

      test('it renders endzone component bridging gap between domain and extended domain', () => {
        const component = shallow(
          <XYChart {...defaultProps} minInterval={24 * 60 * 60 * 1000} args={timeArgs} />
        );

        expect(component.find(XyEndzones).dive().find('Endzones').props()).toEqual(
          expect.objectContaining({
            domainStart: new Date('2021-04-22T12:00:00.000Z').valueOf(),
            domainEnd: new Date('2021-04-24T12:00:00.000Z').valueOf(),
            domainMin: new Date('2021-04-22').valueOf(),
            domainMax: new Date('2021-04-24').valueOf(),
          })
        );
      });

      test('should pass enabled histogram mode and min interval to endzones component', () => {
        const component = shallow(
          <XYChart {...defaultProps} minInterval={24 * 60 * 60 * 1000} args={defaultTimeArgs} />
        );

        expect(component.find(XyEndzones).dive().find('Endzones').props()).toEqual(
          expect.objectContaining({
            interval: 24 * 60 * 60 * 1000,
            isFullBin: false,
          })
        );
      });

      test('should pass disabled histogram mode and min interval to endzones component', () => {
        const component = shallow(
          <XYChart
            {...defaultProps}
            minInterval={24 * 60 * 60 * 1000}
            args={{
              ...args,
              layers: [
                {
                  ...(args.layers[0] as DataLayerConfigResult),
                  seriesType: 'bar',
                  xScaleType: 'time',
                  isHistogram: true,
                },
              ],
            }}
          />
        );

        expect(component.find(XyEndzones).dive().find('Endzones').props()).toEqual(
          expect.objectContaining({
            interval: 24 * 60 * 60 * 1000,
            isFullBin: true,
          })
        );
      });

      test('it does not render endzones if disabled via settings', () => {
        const component = shallow(
          <XYChart
            {...defaultProps}
            minInterval={24 * 60 * 60 * 1000}
            args={{ ...defaultTimeArgs, hideEndzones: true }}
          />
        );

        expect(component.find(XyEndzones).length).toEqual(0);
      });
    });
  });

  describe('y axis extents', () => {
    const { args } = sampleArgs();

    test('it passes custom y axis extents to elastic-charts axis spec', () => {
      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...args,
            yLeftExtent: {
              type: 'axisExtentConfig',
              mode: 'custom',
              lowerBound: 123,
              upperBound: 456,
            },
          }}
        />
      );
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: false,
        min: 123,
        max: 456,
      });
    });

    test('it passes fit to bounds y axis extents to elastic-charts axis spec', () => {
      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...args,
            yLeftExtent: {
              type: 'axisExtentConfig',
              mode: 'dataBounds',
            },
          }}
        />
      );
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: true,
        min: NaN,
        max: NaN,
      });
    });

    test('it does not allow fit for area chart', () => {
      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...args,
            yLeftExtent: {
              type: 'axisExtentConfig',
              mode: 'dataBounds',
            },
            layers: [
              {
                ...(args.layers[0] as DataLayerConfigResult),
                seriesType: 'area',
              },
            ],
          }}
        />
      );
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: false,
        min: NaN,
        max: NaN,
      });
    });

    test('it does include referenceLine values when in full extent mode', () => {
      const { args: refArgs } = sampleArgsWithReferenceLine();

      const component = shallow(<XYChart {...defaultProps} args={refArgs} />);
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: false,
        min: 0,
        max: 150,
      });
    });

    test('it should ignore referenceLine values when set to custom extents', () => {
      const { args: refArgs } = sampleArgsWithReferenceLine();

      const component = shallow(
        <XYChart
          {...defaultProps}
          args={{
            ...refArgs,
            yLeftExtent: {
              type: 'axisExtentConfig',
              mode: 'custom',
              lowerBound: 123,
              upperBound: 456,
            },
          }}
        />
      );
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: false,
        min: 123,
        max: 456,
      });
    });

    test('it should work for negative values in referenceLines', () => {
      const { args: refArgs } = sampleArgsWithReferenceLine(-150);

      const component = shallow(<XYChart {...defaultProps} args={refArgs} />);
      expect(component.find(Axis).find('[id="left"]').prop('domain')).toEqual({
        fit: false,
        min: -150,
        max: 5,
      });
    });
  });

  test('it has xDomain undefined if the x is not a time scale or a histogram', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              seriesType: 'line',
              xScaleType: 'linear',
            },
          ],
        }}
      />
    );
    const xDomain = component.find(Settings).prop('xDomain');
    expect(xDomain).toEqual(undefined);
  });

  test('it uses min interval if interval is passed in and visualization is histogram', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        minInterval={101}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              seriesType: 'line',
              xScaleType: 'linear',
              isHistogram: true,
            },
          ],
        }}
      />
    );
    expect(component.find(Settings).prop('xDomain')).toEqual({
      minInterval: 101,
      min: NaN,
      max: NaN,
    });
  });

  test('disabled legend extra by default', () => {
    const { args } = sampleArgs();
    const component = shallow(<XYChart {...defaultProps} args={args} />);
    expect(component.find(Settings).at(0).prop('showLegendExtra')).toEqual(false);
  });

  test('ignores legend extra for ordinal chart', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart {...defaultProps} args={{ ...args, valuesInLegend: true }} />
    );
    expect(component.find(Settings).at(0).prop('showLegendExtra')).toEqual(false);
  });

  test('shows legend extra for histogram chart', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [dateHistogramLayer],
          valuesInLegend: true,
        }}
      />
    );
    expect(component.find(Settings).at(0).prop('showLegendExtra')).toEqual(true);
  });

  test('it renders bar', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'bar' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries).toHaveLength(2);
    expect(barSeries.at(0).prop('yAccessors')).toEqual(['a']);
    expect(barSeries.at(1).prop('yAccessors')).toEqual(['b']);
  });

  test('it renders area', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'area' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const areaSeries = component.find(DataLayers).dive().find(AreaSeries);
    expect(areaSeries).toHaveLength(2);
    expect(areaSeries.at(0).prop('yAccessors')).toEqual(['a']);
    expect(areaSeries.at(1).prop('yAccessors')).toEqual(['b']);
  });

  test('it renders horizontal bar', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'bar_horizontal' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries).toHaveLength(2);
    expect(barSeries.at(0).prop('yAccessors')).toEqual(['a']);
    expect(barSeries.at(1).prop('yAccessors')).toEqual(['b']);
    expect(component.find(Settings).prop('rotation')).toEqual(90);
  });

  test('it renders regular bar empty placeholder for no results', () => {
    const { data, args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: args.layers.map((layer) => ({ ...layer, table: { ...data, rows: [] } })),
        }}
      />
    );

    expect(component.find(BarSeries)).toHaveLength(0);
    expect(component.find(EmptyPlaceholder).prop('icon')).toBeDefined();
  });

  test('onBrushEnd returns correct context data for date histogram data', () => {
    const { args } = sampleArgs();

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [dateHistogramLayer],
        }}
      />
    );
    wrapper.find(Settings).first().prop('onBrushEnd')!({ x: [1585757732783, 1585758880838] });

    expect(onSelectRange).toHaveBeenCalledWith({
      column: 0,
      table: dateHistogramData.tables.timeLayer,
      range: [1585757732783, 1585758880838],
    });
  });

  test('onBrushEnd returns correct context data for number histogram data', () => {
    const { args } = sampleArgs();

    const numberHistogramData: Datatable = {
      type: 'datatable',
      rows: [
        {
          xAccessorId: 5,
          yAccessorId: 1,
        },
        {
          xAccessorId: 7,
          yAccessorId: 1,
        },
        {
          xAccessorId: 8,
          yAccessorId: 1,
        },
        {
          xAccessorId: 10,
          yAccessorId: 1,
        },
      ],
      columns: [
        {
          id: 'xAccessorId',
          name: 'bytes',
          meta: { type: 'number' },
        },
        {
          id: 'yAccessorId',
          name: 'Count of records',
          meta: { type: 'number' },
        },
      ],
    };

    const numberLayer: DataLayerConfigResult = {
      type: 'dataLayer',
      layerType: LayerTypes.DATA,
      hide: false,
      xAccessor: 'xAccessorId',
      yScaleType: 'linear',
      xScaleType: 'linear',
      isHistogram: true,
      seriesType: 'bar_stacked',
      accessors: ['yAccessorId'],
      palette: mockPaletteOutput,
      table: numberHistogramData,
    };

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [numberLayer],
        }}
      />
    );

    wrapper.find(Settings).first().prop('onBrushEnd')!({ x: [5, 8] });

    expect(onSelectRange).toHaveBeenCalledWith({
      column: 0,
      table: numberHistogramData,
      range: [5, 8],
    });
  });

  test('onBrushEnd is not set on non-interactive mode', () => {
    const { args } = sampleArgs();

    const wrapper = mountWithIntl(<XYChart {...defaultProps} args={args} interactive={false} />);

    expect(wrapper.find(Settings).first().prop('onBrushEnd')).toBeUndefined();
  });

  test('allowBrushingLastHistogramBin is true for date histogram data', () => {
    const { args } = sampleArgs();

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [dateHistogramLayer],
        }}
      />
    );
    expect(wrapper.find(Settings).at(0).prop('allowBrushingLastHistogramBin')).toEqual(true);
  });

  test('onElementClick returns correct context data', () => {
    const geometry: GeometryValue = { x: 5, y: 1, accessor: 'y1', mark: null, datum: {} };
    const series = {
      key: 'spec{d}yAccessor{d}splitAccessors{b-2}',
      specId: 'd',
      yAccessor: 'd',
      splitAccessors: {},
      seriesKeys: [2, 'd'],
    };

    const { args, data } = sampleArgs();

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              type: 'dataLayer',
              layerType: LayerTypes.DATA,
              isHistogram: true,
              seriesType: 'bar_stacked',
              xAccessor: 'b',
              yScaleType: 'linear',
              xScaleType: 'time',
              splitAccessor: 'b',
              accessors: ['d'],
              columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
              palette: mockPaletteOutput,
              table: data,
            },
          ],
        }}
      />
    );

    wrapper.find(Settings).first().prop('onElementClick')!([
      [geometry, series as XYChartSeriesIdentifier],
    ]);

    expect(onClickValue).toHaveBeenCalledWith({
      data: [
        {
          column: 1,
          row: 1,
          table: data,
          value: 5,
        },
        {
          column: 1,
          row: 0,
          table: data,
          value: 2,
        },
      ],
    });
  });

  test('onElementClick returns correct context data for date histogram', () => {
    const geometry: GeometryValue = {
      x: 1585758120000,
      y: 1,
      accessor: 'y1',
      mark: null,
      datum: {},
    };
    const series = {
      key: 'spec{d}yAccessor{d}splitAccessors{b-2}',
      specId: 'd',
      yAccessor: 'yAccessorId',
      splitAccessors: {},
      seriesKeys: ['yAccessorId'],
    };

    const { args } = sampleArgs();

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [dateHistogramLayer],
        }}
      />
    );

    wrapper.find(Settings).first().prop('onElementClick')!([
      [geometry, series as XYChartSeriesIdentifier],
    ]);

    expect(onClickValue).toHaveBeenCalledWith({
      data: [
        {
          column: 0,
          row: 0,
          table: dateHistogramData.tables.timeLayer,
          value: 1585758120000,
        },
      ],
    });
  });

  test('onElementClick returns correct context data for numeric histogram', () => {
    const { args } = sampleArgs();

    const numberHistogramData: Datatable = {
      type: 'datatable',
      rows: [
        {
          xAccessorId: 5,
          yAccessorId: 1,
        },
        {
          xAccessorId: 7,
          yAccessorId: 1,
        },
        {
          xAccessorId: 8,
          yAccessorId: 1,
        },
        {
          xAccessorId: 10,
          yAccessorId: 1,
        },
      ],
      columns: [
        {
          id: 'xAccessorId',
          name: 'bytes',
          meta: { type: 'number' },
        },
        {
          id: 'yAccessorId',
          name: 'Count of records',
          meta: { type: 'number' },
        },
      ],
    };

    const numberLayer: DataLayerConfigResult = {
      type: 'dataLayer',
      layerType: LayerTypes.DATA,
      hide: false,
      xAccessor: 'xAccessorId',
      yScaleType: 'linear',
      xScaleType: 'linear',
      isHistogram: true,
      seriesType: 'bar_stacked',
      accessors: ['yAccessorId'],
      palette: mockPaletteOutput,
      table: numberHistogramData,
    };

    const geometry: GeometryValue = {
      x: 5,
      y: 1,
      accessor: 'y1',
      mark: null,
      datum: {},
    };
    const series = {
      key: 'spec{d}yAccessor{d}splitAccessors{b-2}',
      specId: 'd',
      yAccessor: 'yAccessorId',
      splitAccessors: {},
      seriesKeys: ['yAccessorId'],
    };

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [numberLayer],
        }}
      />
    );

    wrapper.find(Settings).first().prop('onElementClick')!([
      [geometry, series as XYChartSeriesIdentifier],
    ]);

    expect(onClickValue).toHaveBeenCalledWith({
      data: [
        {
          column: 0,
          row: 0,
          table: numberHistogramData,
          value: 5,
        },
      ],
      timeFieldName: undefined,
    });
  });

  test('returns correct original data for ordinal x axis with special formatter', () => {
    const geometry: GeometryValue = { x: 'BAR', y: 1, accessor: 'y1', mark: null, datum: {} };
    const series = {
      key: 'spec{d}yAccessor{d}splitAccessors{b-2}',
      specId: 'd',
      yAccessor: 'a',
      splitAccessors: {},
      seriesKeys: ['a'],
    };

    const { args, data } = sampleArgs();

    convertSpy.mockImplementation((x) => (typeof x === 'string' ? x.toUpperCase() : x));

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              type: 'dataLayer',
              layerType: LayerTypes.DATA,
              seriesType: 'line',
              xAccessor: 'd',
              accessors: ['a', 'b'],
              columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
              xScaleType: 'ordinal',
              yScaleType: 'linear',
              isHistogram: false,
              palette: mockPaletteOutput,
              table: data,
            },
          ],
        }}
      />
    );

    wrapper.find(Settings).first().prop('onElementClick')!([
      [geometry, series as XYChartSeriesIdentifier],
    ]);

    expect(onClickValue).toHaveBeenCalledWith({
      data: [
        {
          column: 3,
          row: 1,
          table: data,
          value: 'Bar',
        },
      ],
    });
  });

  test('sets up correct yScaleType equal to binary_linear for bytes formatting', () => {
    const { args, data } = sampleArgs();

    const [firstCol, ...rest] = data.columns;
    const newData: Datatable = {
      ...data,
      columns: [
        {
          ...firstCol,
          meta: {
            type: 'number',
            params: { id: 'bytes', params: { pattern: '0,0.00b' } },
          },
        },
        ...rest,
      ],
    };

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              type: 'dataLayer',
              layerType: LayerTypes.DATA,
              seriesType: 'line',
              xAccessor: 'd',
              accessors: ['a', 'b'],
              columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
              xScaleType: 'ordinal',
              yScaleType: 'linear',
              isHistogram: false,
              palette: mockPaletteOutput,
              table: newData,
            },
          ],
        }}
      />
    );

    expect(wrapper.find(LineSeries).at(0).prop('yScaleType')).toEqual('linear_binary');
  });

  test('allowBrushingLastHistogramBin should be fakse for ordinal data', () => {
    const { args, data } = sampleArgs();

    const wrapper = mountWithIntl(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              type: 'dataLayer',
              layerType: LayerTypes.DATA,
              seriesType: 'line',
              xAccessor: 'd',
              accessors: ['a', 'b'],
              columnToLabel: '{"a": "Label A", "b": "Label B", "d": "Label D"}',
              xScaleType: 'ordinal',
              yScaleType: 'linear',
              isHistogram: false,
              palette: mockPaletteOutput,
              table: data,
            },
          ],
        }}
      />
    );

    expect(wrapper.find(Settings).at(0).prop('allowBrushingLastHistogramBin')).toEqual(false);
  });

  test('onElementClick is not triggering event on non-interactive mode', () => {
    const { args } = sampleArgs();

    const wrapper = mountWithIntl(<XYChart {...defaultProps} args={args} interactive={false} />);

    expect(wrapper.find(Settings).first().prop('onElementClick')).toBeUndefined();
  });

  test('legendAction is not triggering event on non-interactive mode', () => {
    const { args } = sampleArgs();

    const wrapper = mountWithIntl(<XYChart {...defaultProps} args={args} interactive={false} />);

    expect(wrapper.find(Settings).first().prop('legendAction')).toBeUndefined();
  });

  test('it renders stacked bar', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'bar_stacked' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries).toHaveLength(2);
    expect(barSeries.at(0).prop('stackAccessors')).toHaveLength(1);
    expect(barSeries.at(1).prop('stackAccessors')).toHaveLength(1);
  });

  test('it renders stacked area', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), seriesType: 'area_stacked' }],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const areaSeries = component.find(DataLayers).dive().find(AreaSeries);
    expect(areaSeries).toHaveLength(2);
    expect(areaSeries.at(0).prop('stackAccessors')).toHaveLength(1);
    expect(areaSeries.at(1).prop('stackAccessors')).toHaveLength(1);
  });

  test('it renders stacked horizontal bar', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            { ...(args.layers[0] as DataLayerConfigResult), seriesType: 'bar_horizontal_stacked' },
          ],
        }}
      />
    );
    expect(component).toMatchSnapshot();

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries).toHaveLength(2);
    expect(barSeries.at(0).prop('stackAccessors')).toHaveLength(1);
    expect(barSeries.at(1).prop('stackAccessors')).toHaveLength(1);
    expect(component.find(Settings).prop('rotation')).toEqual(90);
  });

  test('it renders stacked bar empty placeholder for no results', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              xAccessor: undefined,
              splitAccessor: 'e',
              seriesType: 'bar_stacked',
            },
          ],
        }}
      />
    );

    expect(component.find(DataLayers)).toHaveLength(0);
    expect(component.find(EmptyPlaceholder).prop('icon')).toBeDefined();
  });

  test('it passes time zone to the series', () => {
    const { args } = sampleArgs();
    const component = shallow(<XYChart {...defaultProps} args={args} timeZone="CEST" />);

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    expect(lineSeries.at(0).prop('timeZone')).toEqual('CEST');
    expect(lineSeries.at(1).prop('timeZone')).toEqual('CEST');
  });

  test('it applies histogram mode to the series for single series', () => {
    const { args } = sampleArgs();
    const firstLayer: DataLayerConfigResult = {
      ...args.layers[0],
      accessors: ['b'],
      seriesType: 'bar',
      isHistogram: true,
    } as DataLayerConfigResult;
    delete firstLayer.splitAccessor;
    const component = shallow(
      <XYChart {...defaultProps} args={{ ...args, layers: [firstLayer] }} />
    );
    expect(
      component.find(DataLayers).dive().find(BarSeries).at(0).prop('enableHistogramMode')
    ).toEqual(true);
  });

  test('it does not apply histogram mode to more than one bar series for unstacked bar chart', () => {
    const { args } = sampleArgs();
    const firstLayer: DataLayerConfigResult = {
      ...args.layers[0],
      seriesType: 'bar',
      isHistogram: true,
    } as DataLayerConfigResult;
    delete firstLayer.splitAccessor;
    const component = shallow(
      <XYChart {...defaultProps} args={{ ...args, layers: [firstLayer] }} />
    );

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries.at(0).prop('enableHistogramMode')).toEqual(false);
    expect(barSeries.at(1).prop('enableHistogramMode')).toEqual(false);
  });

  test('it applies histogram mode to more than one the series for unstacked line/area chart', () => {
    const { args } = sampleArgs();
    const firstLayer: DataLayerConfigResult = {
      ...args.layers[0],
      seriesType: 'line',
      isHistogram: true,
    } as DataLayerConfigResult;
    delete firstLayer.splitAccessor;
    const secondLayer: DataLayerConfigResult = {
      ...args.layers[0],
      seriesType: 'line',
      isHistogram: true,
    } as DataLayerConfigResult;
    delete secondLayer.splitAccessor;
    const component = shallow(
      <XYChart {...defaultProps} args={{ ...args, layers: [firstLayer, secondLayer] }} />
    );

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    expect(lineSeries.at(0).prop('enableHistogramMode')).toEqual(true);
    expect(lineSeries.at(1).prop('enableHistogramMode')).toEqual(true);
  });

  test('it applies histogram mode to the series for stacked series', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              seriesType: 'bar_stacked',
              isHistogram: true,
            },
          ],
        }}
      />
    );

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries.at(0).prop('enableHistogramMode')).toEqual(true);
    expect(barSeries.at(1).prop('enableHistogramMode')).toEqual(true);
  });

  test('it does not apply histogram mode for splitted series', () => {
    const { args } = sampleArgs();
    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            { ...(args.layers[0] as DataLayerConfigResult), seriesType: 'bar', isHistogram: true },
          ],
        }}
      />
    );

    const barSeries = component.find(DataLayers).dive().find(BarSeries);
    expect(barSeries.at(0).prop('enableHistogramMode')).toEqual(false);
    expect(barSeries.at(1).prop('enableHistogramMode')).toEqual(false);
  });

  describe('y axes', () => {
    const args = createArgsWithLayers();
    const layer = args.layers[0] as DataLayerConfigResult;

    test('single axis if possible', () => {
      const newArgs = {
        ...args,
        layers: args.layers.map((l) => ({
          ...layer,
          table: dataWithoutFormats,
        })),
      };
      const component = getRenderedComponent(newArgs);
      const axes = component.find(Axis);
      expect(axes).toHaveLength(2);
    });

    test('multiple axes because of config', () => {
      const newArgs: XYProps = {
        ...args,
        layers: [
          {
            ...layer,
            accessors: ['a', 'b'],
            yConfig: [
              {
                type: 'yConfig',
                forAccessor: 'a',
                axisMode: 'left',
              },
              {
                type: 'yConfig',
                forAccessor: 'b',
                axisMode: 'right',
              },
            ],
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const axes = component.find(Axis);
      expect(axes).toHaveLength(3);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      expect(lineSeries.at(0).prop('groupId')).toEqual(axes.at(1).prop('groupId'));
      expect(lineSeries.at(1).prop('groupId')).toEqual(axes.at(2).prop('groupId'));
    });

    test('multiple axes because of incompatible formatters', () => {
      const newArgs: XYProps = {
        ...args,
        layers: [
          {
            ...layer,
            accessors: ['c', 'd'],
            table: dataWithFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const axes = component.find(Axis);
      expect(axes).toHaveLength(3);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      expect(lineSeries.at(0).prop('groupId')).toEqual(axes.at(1).prop('groupId'));
      expect(lineSeries.at(1).prop('groupId')).toEqual(axes.at(2).prop('groupId'));
    });

    test('single axis despite different formatters if enforced', () => {
      const newArgs: XYProps = {
        ...args,
        layers: [
          {
            ...layer,
            accessors: ['c', 'd'],
            yConfig: [
              {
                type: 'yConfig',
                forAccessor: 'c',
                axisMode: 'left',
              },
              {
                type: 'yConfig',
                forAccessor: 'd',
                axisMode: 'left',
              },
            ],
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const axes = component.find(Axis);
      expect(axes).toHaveLength(2);
    });
  });

  describe('y series coloring', () => {
    const args = createArgsWithLayers();
    const layer = args.layers[0] as DataLayerConfigResult;

    test('color is applied to chart for multiple series', () => {
      const newArgs: XYProps = {
        ...args,
        layers: [
          {
            ...layer,
            type: 'extendedDataLayer',
            accessors: ['a', 'b'],
            splitAccessor: undefined,
            yConfig: [
              {
                type: 'yConfig',
                forAccessor: 'a',
                color: '#550000',
              },
              {
                type: 'yConfig',
                forAccessor: 'b',
                color: '#FFFF00',
              },
            ],
            table: dataWithoutFormats,
          } as ExtendedDataLayerConfigResult,
          {
            ...layer,
            type: 'extendedDataLayer',
            accessors: ['c'],
            splitAccessor: undefined,
            yConfig: [
              {
                type: 'yConfig',
                forAccessor: 'c',
                color: '#FEECDF',
              },
            ],
            table: dataWithoutFormats,
          } as ExtendedDataLayerConfigResult,
        ],
      };

      const component = getRenderedComponent(newArgs);
      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      expect(
        (lineSeries.at(0).prop('color') as Function)!({
          yAccessor: 'a',
          seriesKeys: ['a'],
        })
      ).toEqual('#550000');
      expect(
        (lineSeries.at(1).prop('color') as Function)!({
          yAccessor: 'b',
          seriesKeys: ['b'],
        })
      ).toEqual('#FFFF00');
      expect(
        (lineSeries.at(2).prop('color') as Function)!({
          yAccessor: 'c',
          seriesKeys: ['c'],
        })
      ).toEqual('#FEECDF');
    });
    test('color is not applied to chart when splitAccessor is defined or when yConfig is not configured', () => {
      const newArgs: XYProps = {
        ...args,
        layers: [
          {
            ...layer,
            accessors: ['a'],
            yConfig: [
              {
                type: 'yConfig',
                forAccessor: 'a',
                color: '#550000',
              },
            ],
            table: dataWithoutFormats,
          },
          {
            ...layer,
            accessors: ['c'],
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      expect(
        (lineSeries.at(0).prop('color') as Function)!({
          yAccessor: 'a',
          seriesKeys: ['a'],
        })
      ).toEqual('blue');
      expect(
        (lineSeries.at(1).prop('color') as Function)!({
          yAccessor: 'c',
          seriesKeys: ['c'],
        })
      ).toEqual('blue');
    });
  });

  describe('provides correct series naming', () => {
    const nameFnArgs = {
      seriesKeys: [],
      key: '',
      specId: 'a',
      yAccessor: '',
      splitAccessors: new Map(),
    };

    test('simplest xy chart without human-readable name', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a'],
            splitAccessor: undefined,
            columnToLabel: '',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const nameFn = component
        .find(DataLayers)
        .dive()
        .find(LineSeries)
        .prop('name') as SeriesNameFn;

      // In this case, the ID is used as the name. This shouldn't happen in practice
      expect(nameFn({ ...nameFnArgs, seriesKeys: ['a'] }, false)).toEqual(null);
      expect(nameFn({ ...nameFnArgs, seriesKeys: ['nonsense'] }, false)).toEqual(null);
    });

    test('simplest xy chart with empty name', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a'],
            splitAccessor: undefined,
            columnToLabel: '{"a":""}',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const nameFn = component
        .find(DataLayers)
        .dive()
        .find(LineSeries)
        .prop('name') as SeriesNameFn;

      // In this case, the ID is used as the name. This shouldn't happen in practice
      expect(nameFn({ ...nameFnArgs, seriesKeys: ['a'] }, false)).toEqual('');
      expect(nameFn({ ...nameFnArgs, seriesKeys: ['nonsense'] }, false)).toEqual(null);
    });

    test('simplest xy chart with human-readable name', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a'],
            splitAccessor: undefined,
            columnToLabel: '{"a":"Column A"}',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const nameFn = component
        .find(DataLayers)
        .dive()
        .find(LineSeries)
        .prop('name') as SeriesNameFn;

      expect(nameFn({ ...nameFnArgs, seriesKeys: ['a'] }, false)).toEqual('Column A');
    });

    test('multiple y accessors', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a', 'b'],
            splitAccessor: undefined,
            columnToLabel: '{"a": "Label A"}',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      const nameFn1 = lineSeries.at(0).prop('name') as SeriesNameFn;
      const nameFn2 = lineSeries.at(1).prop('name') as SeriesNameFn;

      // This accessor has a human-readable name
      expect(nameFn1({ ...nameFnArgs, seriesKeys: ['a'] }, false)).toEqual('Label A');
      // This accessor does not
      expect(nameFn2({ ...nameFnArgs, seriesKeys: ['b'] }, false)).toEqual(null);
      expect(nameFn1({ ...nameFnArgs, seriesKeys: ['nonsense'] }, false)).toEqual(null);
    });

    test('split series without formatting and single y accessor', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a'],
            splitAccessor: 'd',
            columnToLabel: '{"a": "Label A"}',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const nameFn = component
        .find(DataLayers)
        .dive()
        .find(LineSeries)
        .prop('name') as SeriesNameFn;

      expect(nameFn({ ...nameFnArgs, seriesKeys: ['split1', 'a'] }, false)).toEqual('split1');
    });

    test('split series with formatting and single y accessor', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a'],
            splitAccessor: 'd',
            columnToLabel: '{"a": "Label A"}',
            table: dataWithFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);
      const nameFn = component
        .find(DataLayers)
        .dive()
        .find(LineSeries)
        .prop('name') as SeriesNameFn;

      convertSpy.mockReturnValueOnce('formatted');
      expect(nameFn({ ...nameFnArgs, seriesKeys: ['split1', 'a'] }, false)).toEqual('formatted');
      expect(getFormatSpy).toHaveBeenCalledWith({ id: 'custom' });
    });

    test('split series without formatting with multiple y accessors', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a', 'b'],
            splitAccessor: 'd',
            columnToLabel: '{"a": "Label A","b": "Label B"}',
            table: dataWithoutFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      const nameFn1 = lineSeries.at(0).prop('name') as SeriesNameFn;
      const nameFn2 = lineSeries.at(0).prop('name') as SeriesNameFn;

      expect(nameFn1({ ...nameFnArgs, seriesKeys: ['split1', 'a'] }, false)).toEqual(
        'split1 - Label A'
      );
      expect(nameFn2({ ...nameFnArgs, seriesKeys: ['split1', 'b'] }, false)).toEqual(
        'split1 - Label B'
      );
    });

    test('split series with formatting with multiple y accessors', () => {
      const args = createArgsWithLayers();
      const newArgs = {
        ...args,
        layers: [
          {
            ...args.layers[0],
            accessors: ['a', 'b'],
            splitAccessor: 'd',
            columnToLabel: '{"a": "Label A","b": "Label B"}',
            table: dataWithFormats,
          },
        ],
      };

      const component = getRenderedComponent(newArgs);

      const lineSeries = component.find(DataLayers).dive().find(LineSeries);
      const nameFn1 = lineSeries.at(0).prop('name') as SeriesNameFn;
      const nameFn2 = lineSeries.at(1).prop('name') as SeriesNameFn;

      convertSpy.mockReturnValueOnce('formatted1').mockReturnValueOnce('formatted2');
      expect(nameFn1({ ...nameFnArgs, seriesKeys: ['split1', 'a'] }, false)).toEqual(
        'formatted1 - Label A'
      );
      expect(nameFn2({ ...nameFnArgs, seriesKeys: ['split1', 'b'] }, false)).toEqual(
        'formatted2 - Label B'
      );
    });
  });

  test('it set the scale of the x axis according to the args prop', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), xScaleType: 'ordinal' }],
        }}
      />
    );

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    expect(lineSeries.at(0).prop('xScaleType')).toEqual(ScaleType.Ordinal);
    expect(lineSeries.at(1).prop('xScaleType')).toEqual(ScaleType.Ordinal);
  });

  test('it set the scale of the y axis according to the args prop', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), yScaleType: 'sqrt' }],
        }}
      />
    );

    const lineSeries = component.find(DataLayers).dive().find(LineSeries);
    expect(lineSeries.at(0).prop('yScaleType')).toEqual(ScaleType.Sqrt);
    expect(lineSeries.at(1).prop('yScaleType')).toEqual(ScaleType.Sqrt);
  });

  test('it gets the formatter for the x axis', () => {
    const { args } = sampleArgs();

    shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    expect(getFormatSpy).toHaveBeenCalledWith({ id: 'string' });
  });

  test('it gets the formatter for the y axis if there is only one accessor', () => {
    const { args } = sampleArgs();

    shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [{ ...(args.layers[0] as DataLayerConfigResult), accessors: ['a'] }],
        }}
      />
    );
    expect(getFormatSpy).toHaveBeenCalledWith({
      id: 'number',
      params: { pattern: '0,0.000' },
    });
  });

  test('it should pass the formatter function to the axis', () => {
    const { args } = sampleArgs();

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const tickFormatter = instance.find(Axis).first().prop('tickFormat');

    if (!tickFormatter) {
      throw new Error('tickFormatter prop not found');
    }

    tickFormatter('I');

    expect(convertSpy).toHaveBeenCalledWith('I');
  });

  test('it should set the tickLabel visibility on the x axis if the tick labels is hidden', () => {
    const { args } = sampleArgs();

    args.tickLabelsVisibilitySettings = {
      x: false,
      yLeft: true,
      yRight: true,
      type: 'tickLabelsConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).first().prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        visible: false,
      },
    });
  });

  test('it should set the tickLabel visibility on the y axis if the tick labels is hidden', () => {
    const { args } = sampleArgs();

    args.tickLabelsVisibilitySettings = {
      x: true,
      yLeft: false,
      yRight: false,
      type: 'tickLabelsConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).at(1).prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        visible: false,
      },
    });
  });

  test('it should set the tickLabel visibility on the x axis if the tick labels is shown', () => {
    const { args } = sampleArgs();

    args.tickLabelsVisibilitySettings = {
      x: true,
      yLeft: true,
      yRight: true,
      type: 'tickLabelsConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).first().prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        visible: true,
      },
    });
  });

  test('it should set the tickLabel orientation on the x axis', () => {
    const { args } = sampleArgs();

    args.labelsOrientation = {
      x: -45,
      yLeft: 0,
      yRight: -90,
      type: 'labelsOrientationConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).first().prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        rotation: -45,
      },
    });
  });

  test('it should set the tickLabel visibility on the y axis if the tick labels is shown', () => {
    const { args } = sampleArgs();

    args.tickLabelsVisibilitySettings = {
      x: false,
      yLeft: true,
      yRight: true,
      type: 'tickLabelsConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).at(1).prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        visible: true,
      },
    });
  });

  test('it should set the tickLabel orientation on the y axis', () => {
    const { args } = sampleArgs();

    args.labelsOrientation = {
      x: -45,
      yLeft: -90,
      yRight: -90,
      type: 'labelsOrientationConfig',
    };

    const instance = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = instance.find(Axis).at(1).prop('style');

    expect(axisStyle).toMatchObject({
      tickLabel: {
        rotation: -90,
      },
    });
  });

  test('it should remove invalid rows', () => {
    const data1: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'a', meta: { type: 'number' } },
        { id: 'b', name: 'b', meta: { type: 'number' } },
        { id: 'c', name: 'c', meta: { type: 'string' } },
      ],
      rows: [
        { a: undefined, b: 2, c: 'I', d: 'Row 1' },
        { a: 1, b: 5, c: 'J', d: 'Row 2' },
      ],
    };

    const data2: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'a', meta: { type: 'number' } },
        { id: 'b', name: 'b', meta: { type: 'number' } },
        { id: 'c', name: 'c', meta: { type: 'string' } },
      ],
      rows: [
        { a: undefined, b: undefined, c: undefined },
        { a: undefined, b: undefined, c: undefined },
      ],
    };

    const args: XYProps = {
      xTitle: '',
      yTitle: '',
      yRightTitle: '',
      legend: { type: 'legendConfig', isVisible: false, position: Position.Top },
      valueLabels: 'hide',
      tickLabelsVisibilitySettings: {
        type: 'tickLabelsConfig',
        x: true,
        yLeft: true,
        yRight: true,
      },
      gridlinesVisibilitySettings: {
        type: 'gridlinesConfig',
        x: true,
        yLeft: false,
        yRight: false,
      },
      labelsOrientation: {
        type: 'labelsOrientationConfig',
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      yLeftExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      yRightExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      layers: [
        {
          type: 'dataLayer',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          xAccessor: 'a',
          accessors: ['c'],
          splitAccessor: 'b',
          columnToLabel: '',
          xScaleType: 'ordinal',
          yScaleType: 'linear',
          isHistogram: false,
          palette: mockPaletteOutput,
          table: data1,
        },
        {
          type: 'dataLayer',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          xAccessor: 'a',
          accessors: ['c'],
          splitAccessor: 'b',
          columnToLabel: '',
          xScaleType: 'ordinal',
          yScaleType: 'linear',
          isHistogram: false,
          palette: mockPaletteOutput,
          table: data2,
        },
      ],
    };

    const component = shallow(<XYChart {...defaultProps} args={args} />);

    const series = component.find(DataLayers).dive().find(LineSeries);

    // Only one series should be rendered, even though 2 are configured
    // This one series should only have one row, even though 2 are sent
    expect(series.prop('data')).toEqual([{ a: 1, b: 5, c: 'J', d: 'Row 2' }]);
  });

  test('it should not remove rows with falsy but non-undefined values', () => {
    const data: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'a', meta: { type: 'number' } },
        { id: 'b', name: 'b', meta: { type: 'number' } },
        { id: 'c', name: 'c', meta: { type: 'number' } },
      ],
      rows: [
        { a: 0, b: 2, c: 5 },
        { a: 1, b: 0, c: 7 },
      ],
    };

    const args: XYProps = {
      xTitle: '',
      yTitle: '',
      yRightTitle: '',
      legend: { type: 'legendConfig', isVisible: false, position: Position.Top },
      valueLabels: 'hide',
      tickLabelsVisibilitySettings: {
        type: 'tickLabelsConfig',
        x: true,
        yLeft: false,
        yRight: false,
      },
      gridlinesVisibilitySettings: {
        type: 'gridlinesConfig',
        x: true,
        yLeft: false,
        yRight: false,
      },
      labelsOrientation: {
        type: 'labelsOrientationConfig',
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      yLeftExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      yRightExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      layers: [
        {
          type: 'dataLayer',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          xAccessor: 'a',
          accessors: ['c'],
          splitAccessor: 'b',
          columnToLabel: '',
          xScaleType: 'ordinal',
          yScaleType: 'linear',
          isHistogram: false,
          palette: mockPaletteOutput,
          table: data,
        },
      ],
    };

    const component = shallow(<XYChart {...defaultProps} args={args} />);

    const series = component.find(DataLayers).dive().find(LineSeries);

    expect(series.prop('data')).toEqual([
      { a: 0, b: 2, c: 5 },
      { a: 1, b: 0, c: 7 },
    ]);
  });

  test('it should show legend for split series, even with one row', () => {
    const data: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'a', meta: { type: 'number' } },
        { id: 'b', name: 'b', meta: { type: 'number' } },
        { id: 'c', name: 'c', meta: { type: 'string' } },
      ],
      rows: [{ a: 1, b: 5, c: 'J' }],
    };

    const args: XYProps = {
      xTitle: '',
      yTitle: '',
      yRightTitle: '',
      legend: { type: 'legendConfig', isVisible: true, position: Position.Top },
      valueLabels: 'hide',
      tickLabelsVisibilitySettings: {
        type: 'tickLabelsConfig',
        x: true,
        yLeft: false,
        yRight: false,
      },
      gridlinesVisibilitySettings: {
        type: 'gridlinesConfig',
        x: true,
        yLeft: false,
        yRight: false,
      },
      labelsOrientation: {
        type: 'labelsOrientationConfig',
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      yLeftExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      yRightExtent: {
        mode: 'full',
        type: 'axisExtentConfig',
      },
      layers: [
        {
          type: 'dataLayer',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          xAccessor: 'a',
          accessors: ['c'],
          splitAccessor: 'b',
          columnToLabel: '',
          xScaleType: 'ordinal',
          yScaleType: 'linear',
          isHistogram: false,
          palette: mockPaletteOutput,
          table: data,
        },
      ],
    };

    const component = shallow(<XYChart {...defaultProps} args={args} />);

    expect(component.find(Settings).prop('showLegend')).toEqual(true);
  });

  test('it should always show legend if showSingleSeries is set', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              accessors: ['a'],
              splitAccessor: undefined,
            },
          ],
          legend: { ...args.legend, isVisible: true, showSingleSeries: true },
        }}
      />
    );

    expect(component.find(Settings).prop('showLegend')).toEqual(true);
  });

  test('it should populate the correct legendPosition if isInside is set', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          layers: [
            {
              ...(args.layers[0] as DataLayerConfigResult),
              accessors: ['a'],
              splitAccessor: undefined,
            },
          ],
          legend: { ...args.legend, isVisible: true, isInside: true },
        }}
      />
    );

    expect(component.find(Settings).prop('legendPosition')).toEqual({
      vAlign: VerticalAlignment.Top,
      hAlign: HorizontalAlignment.Right,
      direction: LayoutDirection.Vertical,
      floating: true,
      floatingColumns: 1,
    });
  });

  test('it not show legend if isVisible is set to false', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          legend: { ...args.legend, isVisible: false },
        }}
      />
    );

    expect(component.find(Settings).prop('showLegend')).toEqual(false);
  });

  test('it should show legend on right side', () => {
    const { args } = sampleArgs();

    const component = shallow(
      <XYChart
        {...defaultProps}
        args={{
          ...args,
          legend: { ...args.legend, position: 'top' },
        }}
      />
    );

    expect(component.find(Settings).prop('legendPosition')).toEqual('top');
  });

  test('it should apply the fitting function to all non-bar series', () => {
    const data: Datatable = createSampleDatatableWithRows([
      { a: 1, b: 2, c: 'I', d: 'Foo' },
      { a: 1, b: 5, c: 'J', d: 'Bar' },
    ]);

    const args: XYProps = createArgsWithLayers([
      { ...sampleLayer, accessors: ['a'], table: data },
      { ...sampleLayer, seriesType: 'bar', accessors: ['a'], table: data },
      { ...sampleLayer, seriesType: 'area', accessors: ['a'], table: data },
      { ...sampleLayer, seriesType: 'area_stacked', accessors: ['a'], table: data },
    ]);

    const component = shallow(
      <XYChart {...defaultProps} args={{ ...args, fittingFunction: 'Carry' }} />
    );
    const dataLayers = component.find(DataLayers).dive();
    expect(dataLayers.find(LineSeries).prop('fit')).toEqual({ type: Fit.Carry });
    expect(dataLayers.find(BarSeries).prop('fit')).toEqual(undefined);
    expect(dataLayers.find(AreaSeries).at(0).prop('fit')).toEqual({ type: Fit.Carry });
    expect(dataLayers.find(AreaSeries).at(0).prop('stackAccessors')).toEqual([]);
    expect(dataLayers.find(AreaSeries).at(1).prop('fit')).toEqual({ type: Fit.Carry });
    expect(dataLayers.find(AreaSeries).at(1).prop('stackAccessors')).toEqual(['c']);
  });

  test('it should apply None fitting function if not specified', () => {
    const { args } = sampleArgs();

    (args.layers[0] as DataLayerConfigResult).accessors = ['a'];

    const component = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    expect(component.find(DataLayers).dive().find(LineSeries).prop('fit')).toEqual({
      type: Fit.None,
    });
  });

  test('it should apply the xTitle if is specified', () => {
    const { args } = sampleArgs();

    args.xTitle = 'My custom x-axis title';

    const component = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    expect(component.find(Axis).at(0).prop('title')).toEqual('My custom x-axis title');
  });

  test('it should hide the X axis title if the corresponding switch is off', () => {
    const { args } = sampleArgs();

    args.axisTitlesVisibilitySettings = {
      x: false,
      yLeft: true,
      yRight: true,
      type: 'axisTitlesVisibilityConfig',
    };

    const component = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    const axisStyle = component.find(Axis).first().prop('style');

    expect(axisStyle).toMatchObject({
      axisTitle: {
        visible: false,
      },
    });
  });

  test('it should show the X axis gridlines if the setting is on', () => {
    const { args } = sampleArgs();

    args.gridlinesVisibilitySettings = {
      x: true,
      yLeft: false,
      yRight: false,
      type: 'gridlinesConfig',
    };

    const component = shallow(<XYChart {...defaultProps} args={{ ...args }} />);

    expect(component.find(Axis).at(0).prop('gridLine')).toMatchObject({
      visible: true,
    });
  });

  test('it should format the boolean values correctly', () => {
    const data: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'a',
          name: 'a',
          meta: { type: 'number', params: { id: 'number', params: { pattern: '0,0.000' } } },
        },
        {
          id: 'b',
          name: 'b',
          meta: { type: 'number', params: { id: 'number', params: { pattern: '000,0' } } },
        },
        {
          id: 'c',
          name: 'c',
          meta: {
            type: 'boolean',
            params: { id: 'boolean' },
          },
        },
      ],
      rows: [
        { a: 5, b: 2, c: 0 },
        { a: 19, b: 5, c: 1 },
      ],
    };

    const timeSampleLayer: DataLayerConfigResult = {
      type: 'dataLayer',
      layerType: LayerTypes.DATA,
      seriesType: 'line',
      xAccessor: 'c',
      accessors: ['a', 'b'],
      xScaleType: 'ordinal',
      yScaleType: 'linear',
      isHistogram: false,
      palette: mockPaletteOutput,
      table: data,
    };

    const args = createArgsWithLayers([timeSampleLayer]);

    const getCustomFormatSpy = jest.fn();
    getCustomFormatSpy.mockReturnValue({ convert: jest.fn((x) => Boolean(x)) });

    const component = shallow(
      <XYChart {...defaultProps} formatFactory={getCustomFormatSpy} args={{ ...args }} />
    );

    expect(component.find(DataLayers).dive().find(LineSeries).at(1).prop('data')).toEqual([
      {
        a: 5,
        b: 2,
        c: false,
      },
      {
        a: 19,
        b: 5,
        c: true,
      },
    ]);
  });

  describe('annotations', () => {
    const sampleStyledAnnotation: EventAnnotationOutput = {
      time: '2022-03-18T08:25:00.000Z',
      label: 'Event 1',
      icon: 'triangle',
      type: 'manual_event_annotation',
      color: 'red',
      lineStyle: 'dashed',
      lineWidth: 3,
    };
    const sampleAnnotationLayers: CommonXYAnnotationLayerConfigResult[] = [
      {
        type: 'annotationLayer',
        layerType: LayerTypes.ANNOTATIONS,
        annotations: [
          {
            time: '2022-03-18T08:25:17.140Z',
            label: 'Annotation',
            type: 'manual_event_annotation',
          },
        ],
      },
    ];

    function sampleArgsWithAnnotation(annotationLayers = sampleAnnotationLayers): XYChartProps {
      const { args } = sampleArgs();
      return {
        args: {
          ...args,
          layers: [dateHistogramLayer, ...annotationLayers],
        },
      };
    }
    test('should render basic annotation', () => {
      const { args } = sampleArgsWithAnnotation();
      const component = mount(<XYChart {...defaultProps} args={args} />);
      expect(component.find('LineAnnotation')).toMatchSnapshot();
    });
    test('should render simplified annotation when hide is true', () => {
      const { args } = sampleArgsWithAnnotation();
      (args.layers[0] as CommonXYAnnotationLayerConfigResult).hide = true;
      const component = mount(<XYChart {...defaultProps} args={args} />);
      expect(component.find('LineAnnotation')).toMatchSnapshot();
    });

    test('should render grouped annotations preserving the shared styles', () => {
      const { args } = sampleArgsWithAnnotation([
        {
          type: 'annotationLayer',
          layerType: LayerTypes.ANNOTATIONS,
          annotations: [
            sampleStyledAnnotation,
            { ...sampleStyledAnnotation, time: '2022-03-18T08:25:00.020Z', label: 'Event 2' },
            {
              ...sampleStyledAnnotation,
              time: '2022-03-18T08:25:00.001Z',
              label: 'Event 3',
            },
          ],
        },
      ]);
      const component = mount(<XYChart {...defaultProps} args={args} />);
      const groupedAnnotation = component.find(LineAnnotation);

      expect(groupedAnnotation.length).toEqual(1);
      // styles are passed because they are shared, dataValues & header is rounded to the interval
      expect(groupedAnnotation).toMatchSnapshot();
      // renders numeric icon for grouped annotations
      const marker = mount(<div>{groupedAnnotation.prop('marker')}</div>);
      const numberIcon = marker.find('NumberIcon');
      expect(numberIcon.length).toEqual(1);
      expect(numberIcon.text()).toEqual('3');

      // checking tooltip
      const renderLinks = mount(<div>{groupedAnnotation.prop('customTooltipDetails')!()}</div>);
      expect(renderLinks.text()).toEqual(
        ' Event 1 2022-03-18T08:25:00.000Z Event 3 2022-03-18T08:25:00.001Z Event 2 2022-03-18T08:25:00.020Z'
      );
    });
    test('should render grouped annotations with default styles', () => {
      const { args } = sampleArgsWithAnnotation([
        {
          type: 'annotationLayer',
          layerType: LayerTypes.ANNOTATIONS,
          annotations: [sampleStyledAnnotation],
        },
        {
          type: 'annotationLayer',
          layerType: LayerTypes.ANNOTATIONS,
          annotations: [
            {
              ...sampleStyledAnnotation,
              icon: 'asterisk',
              color: 'blue',
              lineStyle: 'dotted',
              lineWidth: 10,
              time: '2022-03-18T08:25:00.001Z',
              label: 'Event 2',
            },
          ],
        },
      ]);
      const component = mount(<XYChart {...defaultProps} args={args} />);
      const groupedAnnotation = component.find(LineAnnotation);

      expect(groupedAnnotation.length).toEqual(1);
      // styles are default because they are different for both annotations
      expect(groupedAnnotation).toMatchSnapshot();
    });
    test('should not render hidden annotations', () => {
      const { args } = sampleArgsWithAnnotation([
        {
          type: 'annotationLayer',
          layerType: LayerTypes.ANNOTATIONS,
          annotations: [
            sampleStyledAnnotation,
            { ...sampleStyledAnnotation, time: '2022-03-18T08:30:00.020Z', label: 'Event 2' },
            {
              ...sampleStyledAnnotation,
              time: '2022-03-18T08:35:00.001Z',
              label: 'Event 3',
              isHidden: true,
            },
          ],
        },
      ]);
      const component = mount(<XYChart {...defaultProps} args={args} />);
      const annotations = component.find(LineAnnotation);

      expect(annotations.length).toEqual(2);
    });
  });
});
