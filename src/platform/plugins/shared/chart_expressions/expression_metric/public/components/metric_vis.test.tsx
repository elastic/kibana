/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { render, screen, waitFor } from '@testing-library/react';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { MetricVis, MetricVisComponentProps } from './metric_vis';
import { Metric, MetricElementEvent, MetricWNumber, MetricWTrend, Settings } from '@elastic/charts';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import type { CoreSetup } from '@kbn/core/public';
import { CustomPaletteState } from '@kbn/charts-plugin/common/expressions/palette/types';
import { DimensionsVisParam, MetricVisParam } from '../../common';
import { euiThemeVars } from '@kbn/ui-theme';
import { DEFAULT_TRENDLINE_NAME } from '../../common/constants';
import { PaletteOutput } from '@kbn/coloring';
import { faker } from '@faker-js/faker';
import { of } from 'rxjs';
import { setupChartMocks, cleanChartMocks } from './chart_testing_utilities';

const mockDeserialize = jest.fn(({ id }: { id: string }) => {
  const convertFn = (v: unknown) => `${id}-${v === null ? NaN : v}`;
  return { getConverterFor: () => convertFn };
});

const mockGetColorForValue = jest.fn<undefined | string, any>(() => undefined);

const CURRENCY_DEFAULT_FORMAT = '$0.0';

const mockFormatSettingLookup = jest.fn(() => CURRENCY_DEFAULT_FORMAT);
const mockIsOverridden = jest.fn();

jest.mock('../services', () => ({
  getFormatService: () => {
    return {
      deserialize: mockDeserialize,
    };
  },
  getPaletteService: () => ({
    get: jest.fn(() => ({ getColorForValue: mockGetColorForValue })),
  }),
  getThemeService: () => {
    const { chartPluginMock } = jest.requireActual('@kbn/charts-plugin/public/mocks');
    const { theme: themeServiceMock } = chartPluginMock.createSetupContract();
    return themeServiceMock;
  },
  getUiSettingsService: () => {
    return {
      get: mockFormatSettingLookup,
      isOverridden: mockIsOverridden,
    };
  },
}));

jest.mock('@kbn/field-formats-plugin/common', () => ({
  FORMATS_UI_SETTINGS: {
    FORMAT_NUMBER_DEFAULT_LOCALE: 'format_number_default_locale',
  },
}));

type Props = MetricVisComponentProps;

const dayOfWeekColumnId = 'col-0-0';
const basePriceColumnId = 'col-1-1';
const minPriceColumnId = 'col-2-2';

const defaultMetricParams: MetricVisParam = {
  progressDirection: 'vertical',
  maxCols: 5,
  titlesTextAlign: 'left',
  valuesTextAlign: 'right',
  iconAlign: 'left',
  valueFontSize: 'default',
  secondaryTrend: {
    visuals: undefined,
    baseline: undefined,
    palette: undefined,
  },
};

const table: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: dayOfWeekColumnId,
      name: 'day_of_week: Descending',
      meta: {
        type: 'string',
        field: 'day_of_week',
        index: 'kibana_sample_data_ecommerce',
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: '(missing value)',
          },
        },
        source: 'esaggs',
        sourceParams: {
          hasPrecisionError: false,
          indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
          id: '0',
          enabled: true,
          type: 'terms',
          params: {
            field: 'day_of_week',
            orderBy: '1',
            order: 'desc',
            size: 6,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: '(missing value)',
          },
          schema: 'segment',
        },
      },
    },
    {
      id: basePriceColumnId,
      name: 'Median products.base_price',
      meta: {
        type: 'number',
        field: 'products.base_price',
        index: 'kibana_sample_data_ecommerce',
        params: {
          id: 'number',
          params: {
            pattern: '$0,0.00',
          },
        },
        source: 'esaggs',
        sourceParams: {
          hasPrecisionError: false,
          indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
          id: '1',
          enabled: true,
          type: 'median',
          params: {
            field: 'products.base_price',
          },
          schema: 'metric',
        },
      },
    },
    {
      id: 'col-2-2',
      name: 'Median products.min_price',
      meta: {
        type: 'number',
        field: 'products.min_price',
        index: 'kibana_sample_data_ecommerce',
        params: {
          id: 'number',
          params: {
            pattern: '$0,0.00',
          },
        },
        source: 'esaggs',
        sourceParams: {
          hasPrecisionError: false,
          indexPatternId: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
          id: '2',
          enabled: true,
          type: 'median',
          params: {
            field: 'products.min_price',
          },
          schema: 'metric',
        },
      },
    },
  ],
  rows: [
    {
      [dayOfWeekColumnId]: 'Friday',
      [basePriceColumnId]: 28.984375,
      [minPriceColumnId]: 13.6328125,
    },
    {
      [dayOfWeekColumnId]: 'Wednesday',
      [basePriceColumnId]: 29.984375,
      [minPriceColumnId]: 13.639539930555555,
    },
    {
      [dayOfWeekColumnId]: 'Saturday',
      [basePriceColumnId]: 25.984375,
      [minPriceColumnId]: 13.34375,
    },
    {
      [dayOfWeekColumnId]: 'Sunday',
      [basePriceColumnId]: 25.784375,
      [minPriceColumnId]: 13.4921875,
    },
    {
      [dayOfWeekColumnId]: 'Thursday',
      [basePriceColumnId]: 25.348011363636363,
      [minPriceColumnId]: 13.34376,
    },
    {
      [dayOfWeekColumnId]: '__other__',
      [basePriceColumnId]: 24.984375,
      [minPriceColumnId]: 13.242513020833334,
    },
  ],
};

const defaultProps = {
  renderComplete: jest.fn(),
  fireEvent: jest.fn(),
  filterable: true,
  theme: {
    theme$: of({
      darkMode: false,
      name: 'amsterdam',
    }),
  } as CoreSetup['theme'],
} as Pick<MetricVisComponentProps, 'renderComplete' | 'fireEvent' | 'filterable' | 'theme'>;

type RenderChartPropsType = Partial<Omit<MetricVisComponentProps, 'config'>> &
  Pick<MetricVisComponentProps, 'config'>;

describe('MetricVisComponent', function () {
  beforeAll(() => {
    setupChartMocks();
    jest.useFakeTimers();
  });

  afterAll(() => {
    cleanChartMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    mockDeserialize.mockClear();
  });

  async function waitForChartToRender(renderComplete: MetricVisComponentProps['renderComplete']) {
    // wait for 1 rAF tick (~16ms)
    jest.advanceTimersByTime(30);
    // wait for render complete callback
    await waitFor(() => expect(renderComplete).toHaveBeenCalled());
  }

  async function renderChart(props: RenderChartPropsType) {
    const result = render(<MetricVis {...defaultProps} data={table} {...props} />);
    // quick lifecycle check (this comes from the willRender callback)
    expect(defaultProps.fireEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'chartSize' })
    );
    // wait for render complete callback
    await waitForChartToRender(defaultProps.renderComplete);
    return {
      ...result,
      rerender: async (newProps: Partial<RenderChartPropsType>) => {
        result.rerender(<MetricVis {...defaultProps} data={table} {...props} {...newProps} />);
        await waitForChartToRender(defaultProps.renderComplete);
      },
    };
  }

  describe('single metric', () => {
    const config: Props['config'] = {
      metric: {
        ...defaultMetricParams,
        icon: 'empty',
      },
      dimensions: {
        metric: basePriceColumnId,
      },
    };

    it('should render a single metric value', async () => {
      await renderChart({ config });
      // test that a metric is rendered
      expect(screen.getByText(table.columns[1].name)).toBeInTheDocument();
      expect(screen.getByText(table.rows[0][basePriceColumnId])).toBeInTheDocument();
    });

    it('should display subtitle', async () => {
      await renderChart({
        config: {
          ...config,
          metric: { ...config.metric, subtitle: 'subtitle' },
        },
        data: table,
      });

      // check for the subtitle
      expect(screen.getByText('subtitle')).toBeInTheDocument();
      // and check that the metric is still rendering
      expect(screen.getByText(table.columns[1].name)).toBeInTheDocument();
    });

    it('should display secondary metric', async () => {
      const { rerender } = await renderChart({
        config: {
          ...config,
          metric: { ...config.metric, subtitle: 'subtitle', secondaryPrefix: undefined },
          dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
        },
      });
      // for the secondary metric
      const secondaryLabel = table.columns.find((col) => col.id === minPriceColumnId)!.name;
      expect(screen.getByText(`${secondaryLabel} number-13.6328125`));

      await rerender({
        config: {
          ...config,
          metric: { ...config.metric, subtitle: 'subtitle', secondaryPrefix: 'secondary prefix' },
          dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
        },
      });

      expect(screen.getByText(/secondary prefix/)).toBeInTheDocument();
      expect(screen.queryByText(secondaryLabel)).not.toBeInTheDocument();
    });

    it('should display progress bar if min and max provided', async () => {
      const { rerender } = await renderChart({
        config: {
          ...config,
          metric: {
            ...config.metric,
            progressDirection: 'vertical',
          },
          dimensions: {
            ...config.dimensions,
            max: basePriceColumnId,
          },
        },
      });
      const maxLabel = table.columns.find((col) => col.id === basePriceColumnId)!.name;
      // both are using the same column
      const primaryLabel = maxLabel;

      expect(screen.getByRole('meter')).toBeInTheDocument();
      expect(screen.getByLabelText(`Percentage of ${maxLabel}`)).toBeInTheDocument();

      // now check that without the max accessor the meter div goes away
      await rerender({
        config: {
          ...config,
          metric: {
            ...config.metric,
            progressDirection: 'vertical',
          },
          dimensions: {
            ...config.dimensions,
            max: undefined,
          },
        },
      });

      // metric is still there, sanity check
      expect(screen.getByText(primaryLabel)).toBeInTheDocument();

      // the progress bar is gone
      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(`Percentage of ${maxLabel}`)).not.toBeInTheDocument();

      // Try again with an invalid max accessor
      await rerender({
        config: {
          ...config,
          metric: {
            ...config.metric,
            progressDirection: 'vertical',
          },
          dimensions: {
            ...config.dimensions,
            max: 'foobar',
          },
        },
      });

      // metric is still there, sanity check
      expect(screen.getByText(primaryLabel)).toBeInTheDocument();

      // the progress bar is gone
      expect(screen.queryByRole('meter')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(`Percentage of ${maxLabel}`)).not.toBeInTheDocument();

      // change direction to horizontal and it should be back
      await rerender({
        config: {
          ...config,
          metric: {
            ...config.metric,
            progressDirection: 'horizontal',
          },
          dimensions: {
            ...config.dimensions,
            max: basePriceColumnId,
          },
        },
      });

      expect(screen.getByRole('meter')).toBeInTheDocument();
      expect(screen.getByLabelText(`Percentage of ${maxLabel}`)).toBeInTheDocument();
    });

    it('should configure trendline if provided', async () => {
      const trends = {
        [DEFAULT_TRENDLINE_NAME]: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
          { x: 5, y: 6 },
          { x: 7, y: 8 },
        ],
      };

      await renderChart({
        config: {
          ...config,
          metric: {
            ...config.metric,
            trends,
          },
          dimensions: {
            ...config.dimensions,
            breakdownBy: undefined,
          },
        },
      });
      const primaryLabel = table.columns.find((col) => col.id === basePriceColumnId)!.name;

      expect(screen.getByTitle(`${primaryLabel} over time.`)).toBeInTheDocument();
      expect(
        screen.getByText('A line chart showing the trend of the primary metric over time.')
      ).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should display multi-values non-numeric values formatted and without quotes', async () => {
      const newTable: Datatable = {
        ...table,
        // change the format id for the columns
        columns: table.columns.map((column) =>
          [basePriceColumnId, minPriceColumnId].includes(column.id)
            ? {
                ...column,
                meta: { ...column.meta, params: { id: 'text' } },
              }
            : column
        ),
        rows: table.rows.map((row) => ({
          ...row,
          [basePriceColumnId]: [String(row[basePriceColumnId]), String(100)],
          [minPriceColumnId]: [String(row[minPriceColumnId]), String(10)],
        })),
      };
      await renderChart({ config, data: newTable });

      expect(screen.getByText(/\[text\-28\.984375, text\-100\]/i)).toBeInTheDocument();
    });

    it('should display multi-values numeric values formatted and without quotes', async () => {
      const newTable = {
        ...table,
        rows: table.rows.map((row) => ({
          ...row,
          [basePriceColumnId]: [row[basePriceColumnId], 100],
          [minPriceColumnId]: [row[minPriceColumnId], 10],
        })),
      };
      await renderChart({ config, data: newTable });
      expect(screen.getByText(/\[number\-28\.984375, number\-100\]/i)).toBeInTheDocument();
    });

    it('should display an empty tile if no data is provided', async () => {
      const newTable = {
        ...table,
        rows: [],
      };
      await renderChart({ config, data: newTable });
      const primaryLabel = table.columns.find((col) => col.id === basePriceColumnId)!.name;
      expect(screen.getByTitle(primaryLabel)).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('should convert null values to NaN', async () => {
    const metricId = faker.lorem.word();

    const tableWNull: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: metricId,
          name: metricId,
          meta: {
            type: 'number',
          },
        },
      ],
      rows: [{ [metricId]: null }],
    };
    await renderChart({
      config: {
        metric: {
          ...defaultMetricParams,
        },
        dimensions: {
          metric: metricId,
        },
      },
      data: tableWNull,
    });

    expect(screen.getByTitle(metricId)).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  // do not test with undefined as it relies on a Kibana formatter behaviour which is mocked here

  describe('metric grid', () => {
    const config: Props['config'] = {
      metric: {
        ...defaultMetricParams,
      },
      dimensions: {
        metric: basePriceColumnId,
        breakdownBy: dayOfWeekColumnId,
      },
    };

    it('should render a grid if breakdownBy dimension supplied', async () => {
      await renderChart({ config });

      // check for the labels
      expect(screen.getAllByRole('button', { name: /terms\-/ })).toHaveLength(table.rows.length);

      // now check for the values
      const primaryLabel = table.columns.find((col) => col.id === basePriceColumnId)!.name;
      expect(screen.getAllByText(primaryLabel)).toHaveLength(table.rows.length);
      for (const row of table.rows) {
        expect(screen.getByTitle(`number-${row[basePriceColumnId]}`)).toBeInTheDocument();
      }
    });

    it('should display secondary prefix or secondary metric', async () => {
      const { rerender } = await renderChart({
        config: {
          ...config,
          dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
          metric: { ...config.metric, secondaryPrefix: 'howdy' },
        },
      });

      for (const row of table.rows) {
        expect(
          screen.getByText(new RegExp(`howdy number-${row[minPriceColumnId]}`, 'i'))
        ).toBeInTheDocument();
      }

      // Now remove the prefix and check the secondary label is there
      await rerender({
        config: {
          ...config,
          dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
          metric: { ...config.metric, secondaryPrefix: undefined },
        },
      });

      const secondaryLabel = table.columns.find((col) => col.id === minPriceColumnId)!.name;
      for (const row of table.rows) {
        expect(
          screen.getByText(new RegExp(`${secondaryLabel} number-${row[minPriceColumnId]}`, 'i'))
        ).toBeInTheDocument();
      }
    });

    it('should respect maxCols and minTiles', async () => {
      // start with no constraints
      const { rerender } = await renderChart({
        config: {
          ...config,
          metric: {
            ...config.metric,
          },
        },
      });

      // 5 columns x 2 rows by default
      expect(screen.getByRole('list')).toHaveStyle({
        'grid-template-columns': 'repeat(5, minmax(0, 1fr)',
        'grid-template-rows': 'repeat(2, minmax(64px, 1fr)',
      });

      // now configure maxCols: 2
      await rerender({
        config: {
          ...config,
          metric: {
            ...config.metric,
            maxCols: 2,
          },
        },
      });

      // changed to 2 columns x 3 rows now
      expect(screen.getByRole('list')).toHaveStyle({
        'grid-template-columns': 'repeat(2, minmax(0, 1fr)',
        'grid-template-rows': 'repeat(3, minmax(64px, 1fr)',
      });

      // now configure maxCols: 5 and minTiles: 10
      await rerender({
        config: {
          ...config,
          metric: {
            ...config.metric,
            maxCols: 5,
            minTiles: 10,
          },
        },
      });

      // changed to 5 columns x 2 rows now
      expect(screen.getByRole('list')).toHaveStyle({
        'grid-template-columns': 'repeat(5, minmax(0, 1fr)',
        'grid-template-rows': 'repeat(2, minmax(64px, 1fr)',
      });
    });

    it('should display progress bar if max provided', async () => {
      await renderChart({
        config: {
          ...config,
          metric: {
            ...config.metric,
          },
          dimensions: {
            ...config.dimensions,
            max: basePriceColumnId,
          },
        },
      });

      expect(screen.getAllByRole('meter')).toHaveLength(table.rows.length);
      expect(screen.getAllByLabelText(/Percentage of terms/)).toHaveLength(table.rows.length);
    });
    it.skip('should configure trendlines if provided', () => {
      // Raw values here, not formatted
      const trends: Record<string, MetricWTrend['trend']> = {
        Friday: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        Wednesday: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        Saturday: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        Sunday: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        Thursday: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        __other__: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
        // this one shouldn't show up!
        [DEFAULT_TRENDLINE_NAME]: [
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
          { x: faker.number.int(), y: faker.number.int() },
        ],
      };

      const data = shallow(
        <MetricVis
          config={{
            ...config,
            metric: {
              ...config.metric,
              trends,
            },
          }}
          data={table}
          {...defaultProps}
        />
      )
        .find(Metric)
        .props().data![0] as MetricWTrend[];

      data?.forEach((tileConfig) => {
        // title has been formatted, so clean it up before using as index
        expect(tileConfig.trend).toEqual(trends[tileConfig.title!.replace('terms-', '')]);
        expect(tileConfig.trendShape).toEqual('area');
      });
    });

    it.skip('renders with no data', () => {
      const component = shallow(
        <MetricVis
          config={{ ...config, metric: { ...config.metric, minTiles: 6 } }}
          data={{ type: 'datatable', rows: [], columns: table.columns }}
          {...defaultProps}
        />
      );

      const { data } = component.find(Metric).props();

      expect(data).toBeDefined();
      expect(data).toMatchInlineSnapshot(`
        Array [
          Array [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          Array [
            undefined,
          ],
        ]
      `);
    });
  });

  it.skip('should constrain dimensions in edit mode', () => {
    const getDimensionsRequest = (multipleTiles: boolean) => {
      const fireEvent = jest.fn();
      const wrapper = shallow(
        <MetricVis
          data={table}
          config={{
            metric: {
              ...defaultMetricParams,
            },
            dimensions: {
              metric: basePriceColumnId,
              breakdownBy: multipleTiles ? dayOfWeekColumnId : undefined,
            },
          }}
          {...defaultProps}
          fireEvent={fireEvent}
        />
      );

      wrapper.find(Settings).props().onWillRender!();

      return fireEvent.mock.calls[0][0].data;
    };

    expect(getDimensionsRequest(false)).toMatchInlineSnapshot(`
      Object {
        "maxDimensions": Object {
          "x": Object {
            "unit": "pixels",
            "value": 300,
          },
          "y": Object {
            "unit": "pixels",
            "value": 300,
          },
        },
      }
    `);

    expect(getDimensionsRequest(true)).toMatchInlineSnapshot(`
      Object {
        "maxDimensions": Object {
          "x": Object {
            "unit": "pixels",
            "value": 1000,
          },
          "y": Object {
            "unit": "pixels",
            "value": 400,
          },
        },
      }
    `);
  });

  describe.skip('filter events', () => {
    const fireEventSpy = jest.fn();

    afterEach(() => fireEventSpy.mockClear());

    const fireFilter = (event: MetricElementEvent, filterable: boolean, breakdown?: boolean) => {
      const component = shallow(
        <MetricVis
          config={{
            metric: {
              ...defaultMetricParams,
            },
            dimensions: {
              metric: basePriceColumnId,
              breakdownBy: breakdown ? dayOfWeekColumnId : undefined,
            },
          }}
          data={table}
          {...defaultProps}
          filterable={filterable}
          fireEvent={fireEventSpy}
        />
      );

      component.find(Settings).props().onElementClick!([event]);
    };

    test('without breakdown', () => {
      const event: MetricElementEvent = {
        type: 'metricElementEvent',
        rowIndex: 0,
        columnIndex: 0,
      };

      fireFilter(event, true, false);

      expect(fireEventSpy).toHaveBeenCalledTimes(1);
      expect(fireEventSpy).toHaveBeenCalledWith({
        name: 'filter',
        data: {
          data: [
            {
              table,
              column: 1,
              row: 0,
              value: 28.984375,
            },
          ],
        },
      });
    });

    test('with breakdown', () => {
      const event: MetricElementEvent = {
        type: 'metricElementEvent',
        rowIndex: 1,
        columnIndex: 0,
      };

      fireFilter(event, true, true);

      expect(fireEventSpy).toHaveBeenCalledTimes(1);
      expect(fireEventSpy).toHaveBeenCalledWith({
        name: 'filter',
        data: {
          data: [
            {
              table,
              column: 0,
              row: 5,
              value: '__other__',
            },
          ],
        },
      });
    });

    it('should do nothing if primary metric is not filterable', () => {
      const props = {
        ...defaultProps,
        filterable: false,
      };
      const metricComponent = shallow(
        <MetricVis
          config={{
            metric: {
              ...defaultMetricParams,
            },
            dimensions: {
              metric: basePriceColumnId,
            },
          }}
          data={table}
          {...props}
        />
      );

      expect(metricComponent.find(Settings).props().onElementClick).toBeUndefined();
    });
  });

  describe.skip('coloring', () => {
    afterEach(() => mockGetColorForValue.mockClear());

    describe('by palette', () => {
      const colorFromPalette = 'color-from-palette';
      mockGetColorForValue.mockReturnValue(colorFromPalette);

      it('should fetch color from palette if provided', () => {
        const component = shallow(
          <MetricVis
            config={{
              dimensions: {
                metric: basePriceColumnId,
              },
              metric: {
                ...defaultMetricParams,
                // should be overridden
                color: 'static-color',
                palette: {
                  type: 'palette',
                  name: 'default',
                  params: {
                    colors: [],
                    gradient: true,
                    stops: [],
                    range: 'number',
                    rangeMin: 2,
                    rangeMax: 10,
                  },
                },
              },
            }}
            data={table}
            {...defaultProps}
          />
        );

        const [[datum]] = component.find(Metric).props().data!;

        expect(datum!.color).toBe(colorFromPalette);
        expect(mockGetColorForValue.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              28.984375,
              Object {
                "colors": Array [],
                "gradient": true,
                "range": "number",
                "rangeMax": 10,
                "rangeMin": 2,
                "stops": Array [],
              },
              Object {
                "max": 57.96875,
                "min": 0,
              },
            ],
          ]
        `);
      });

      describe('percent-based', () => {
        const renderWithPalette = (
          palette: PaletteOutput<CustomPaletteState>,
          dimensions: MetricVisComponentProps['config']['dimensions']
        ) =>
          shallow(
            <MetricVis
              config={{
                dimensions,
                metric: {
                  ...defaultMetricParams,
                  palette,
                },
              }}
              data={table}
              {...defaultProps}
            />
          );

        const dimensionsAndExpectedBounds = [
          [
            'breakdown-by and max',
            {
              metric: minPriceColumnId,
              max: basePriceColumnId,
              breakdownBy: dayOfWeekColumnId,
            },
          ],
          ['just breakdown-by', { metric: minPriceColumnId, breakdownBy: dayOfWeekColumnId }],
          ['just max', { metric: minPriceColumnId, max: basePriceColumnId }],
        ];

        it.each(dimensionsAndExpectedBounds)(
          'should set correct data bounds with %s dimension',
          // @ts-expect-error
          (label, dimensions) => {
            mockGetColorForValue.mockClear();

            renderWithPalette(
              {
                type: 'palette',
                name: 'default',
                params: {
                  range: 'percent',
                  // the rest of these params don't matter
                  colors: [],
                  gradient: false,
                  stops: [],
                  rangeMin: 2,
                  rangeMax: 10,
                },
              },
              dimensions as DimensionsVisParam
            );

            expect(
              mockGetColorForValue.mock.calls.map(([value, _palette, bounds]) => ({
                value,
                ...bounds,
              }))
            ).toMatchSnapshot();
          }
        );
      });
    });

    describe('by static color', () => {
      it('uses static color if no palette', () => {
        const staticColor = 'static-color';

        const component = shallow(
          <MetricVis
            config={{
              dimensions: {
                metric: basePriceColumnId,
              },
              metric: {
                ...defaultMetricParams,
                color: staticColor,
                palette: undefined,
              },
            }}
            data={table}
            {...defaultProps}
          />
        );

        const [[datum]] = component.find(Metric).props().data!;

        expect(datum!.color).toBe(staticColor);
        expect(mockGetColorForValue).not.toHaveBeenCalled();
      });

      it('defaults if no static color', () => {
        const component = shallow(
          <MetricVis
            config={{
              dimensions: {
                metric: basePriceColumnId,
              },
              metric: {
                ...defaultMetricParams,
                color: undefined,
                palette: undefined,
              },
            }}
            data={table}
            {...defaultProps}
          />
        );

        const [[datum]] = component.find(Metric).props().data!;

        expect(datum!.color).toBe(euiThemeVars.euiColorEmptyShade);
        expect(mockGetColorForValue).not.toHaveBeenCalled();
      });
    });
  });

  describe.skip('metric value formatting', () => {
    function nonNullable<T>(v: T): v is NonNullable<T> {
      return v != null;
    }
    const getFormattedMetrics = (
      value: number | string,
      secondaryValue: number | string | undefined,
      fieldFormatter: SerializedFieldFormat<SerializableRecord> | undefined
    ) => {
      const config: Props['config'] = {
        metric: {
          ...defaultMetricParams,
        },
        dimensions: {
          metric: '1',
          secondaryMetric: secondaryValue ? '2' : undefined,
        },
      };

      const component = shallow(
        <MetricVis
          config={config}
          data={{
            type: 'datatable',
            columns: [
              {
                id: '1',
                name: '',
                meta: { type: 'number', params: fieldFormatter },
              },
              secondaryValue
                ? {
                    id: '2',
                    name: '',
                    meta: { type: 'number', params: fieldFormatter },
                  }
                : undefined,
            ].filter(nonNullable) as DatatableColumn[],
            rows: [{ '1': value, '2': secondaryValue }],
          }}
          {...defaultProps}
        />
      );

      const {
        value: primaryMetric,
        valueFormatter,
        extra,
      } = component.find(Metric).props().data?.[0][0]! as MetricWNumber;

      return { primary: valueFormatter(primaryMetric), secondary: extra?.props.children[1] };
    };

    it.each`
      id            | pattern | finalPattern
      ${'number'}   | ${'0'}  | ${'0'}
      ${'currency'} | ${'$0'} | ${'$0'}
      ${'percent'}  | ${'0%'} | ${'0%'}
    `(
      'applies $id custom field format pattern when passed over',
      ({ id, pattern, finalPattern }) => {
        getFormattedMetrics(394.2393, 983123.984, { id, params: { pattern } });
        expect(mockDeserialize).toHaveBeenCalledTimes(2);
        expect(mockDeserialize).toHaveBeenCalledWith({ id, params: { pattern: finalPattern } });
      }
    );

    it.each`
      id
      ${'number'}
      ${'percent'}
    `(
      'does not apply the metric compact format if user customized default settings pattern for $id',
      ({ id }) => {
        mockIsOverridden.mockReturnValueOnce(true);
        getFormattedMetrics(394.2393, 983123.984, { id });
        expect(mockDeserialize).toHaveBeenCalledTimes(2);
        expect(mockDeserialize).toHaveBeenCalledWith({ id });
      }
    );

    it('applies a custom duration configuration to the formatter', () => {
      getFormattedMetrics(394.2393, 983123.984, { id: 'duration' });
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'duration',
        params: { outputFormat: 'humanizePrecise', outputPrecision: 1, useShortSuffix: true },
      });
    });

    it('does not override duration custom configuration when set', () => {
      getFormattedMetrics(394.2393, 983123.984, {
        id: 'duration',
        params: { useShortSuffix: false },
      });
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'duration',
        params: { outputFormat: 'humanizePrecise', outputPrecision: 1, useShortSuffix: false },
      });
    });

    it('does not override duration configuration at visualization level when set', () => {
      getFormattedMetrics(394.2393, 983123.984, {
        id: 'duration',
        params: { formatOverride: true, outputFormat: 'asSeconds' },
      });
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'duration',
        params: { formatOverride: true, outputFormat: 'asSeconds' },
      });
    });

    it('does not tweak bytes format when passed', () => {
      getFormattedMetrics(394.2393, 983123.984, {
        id: 'bytes',
      });
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'bytes',
      });
    });

    it('does not tweak bit format when passed', () => {
      getFormattedMetrics(394.2393, 983123.984, {
        id: 'bytes',
        params: { pattern: '0.0bitd' },
      });
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'bytes',
        params: { pattern: '0.0bitd' },
      });
    });

    it('does not tweak legacy bits format when passed', () => {
      const legacyBitFormat = {
        id: 'number',
        params: { pattern: `0,0bitd` },
      };
      getFormattedMetrics(394.2393, 983123.984, legacyBitFormat);
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith(legacyBitFormat);
    });

    it('calls the formatter only once when no secondary value is passed', () => {
      getFormattedMetrics(394.2393, undefined, { id: 'number' });
      expect(mockDeserialize).toHaveBeenCalledTimes(1);
    });

    it('still call the numeric formatter when no format is passed', () => {
      const { primary, secondary } = getFormattedMetrics(394.2393, 983123.984, undefined);
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({ id: 'number' });
      expect(primary).toBe('number-394.2393');
      expect(secondary).toBe('number-983123.984');
    });
  });

  describe.skip('overrides', () => {
    it('should apply overrides to the settings component', () => {
      const component = shallow(
        <MetricVis
          config={{
            metric: {
              ...defaultMetricParams,
            },
            dimensions: {
              metric: basePriceColumnId,
            },
          }}
          data={table}
          {...defaultProps}
          overrides={{ settings: { onBrushEnd: 'ignore', ariaUseDefaultSummary: true } }}
        />
      );

      const settingsComponent = component.find(Settings);
      expect(settingsComponent.prop('onBrushEnd')).toBeUndefined();
      expect(settingsComponent.prop('ariaUseDefaultSummary')).toEqual(true);
    });
  });
});
