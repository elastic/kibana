/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import { MetricVis, MetricVisComponentProps } from './metric_vis';
import {
  LayoutDirection,
  Metric,
  MetricElementEvent,
  MetricWNumber,
  MetricWProgress,
  MetricWTrend,
  Settings,
} from '@elastic/charts';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import type { IUiSettingsClient } from '@kbn/core/public';
import { CustomPaletteState } from '@kbn/charts-plugin/common/expressions/palette/types';
import { DimensionsVisParam, MetricVisParam } from '../../common';
import { euiThemeVars } from '@kbn/ui-theme';
import { DEFAULT_TRENDLINE_NAME } from '../../common/constants';
import faker from 'faker';

const mockDeserialize = jest.fn(({ id }: { id: string }) => {
  const convertFn = (v: unknown) => `${id}-${v}`;
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
    const { getThemeService } = jest.requireActual('../__mocks__/theme_service');
    return getThemeService();
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
      [basePriceColumnId]: 28.984375,
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
      [minPriceColumnId]: 13.34375,
    },
    {
      [dayOfWeekColumnId]: '__other__',
      [basePriceColumnId]: 24.984375,
      [minPriceColumnId]: 13.242513020833334,
    },
  ],
};

const defaultProps = {
  renderComplete: () => {},
  fireEvent: () => {},
  filterable: true,
  renderMode: 'view',
  uiSettings: {} as unknown as IUiSettingsClient,
} as Pick<MetricVisComponentProps, 'renderComplete' | 'fireEvent' | 'filterable'>;

describe('MetricVisComponent', function () {
  afterEach(() => {
    mockDeserialize.mockClear();
  });

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

    it('should render a single metric value', () => {
      const component = shallow(<MetricVis config={config} data={table} {...defaultProps} />);

      const { data } = component.find(Metric).props();

      expect(data).toBeDefined();
      expect(data?.length).toBe(1);

      const visConfig = data![0][0]!;

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#ffffff",
          "extra": <span />,
          "icon": [Function],
          "subtitle": undefined,
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });
    it('should display subtitle', () => {
      const component = shallow(
        <MetricVis
          config={{
            ...config,
            metric: { ...config.metric, subtitle: 'subtitle' },
          }}
          data={table}
          {...defaultProps}
        />
      );

      const [[visConfig]] = component.find(Metric).props().data!;

      expect(visConfig!.subtitle).toBe('subtitle');
    });
    it('should display secondary metric', () => {
      const getMetricConfig = (localConfig: MetricVisComponentProps['config']) =>
        shallow(<MetricVis config={localConfig} data={table} {...defaultProps} />)
          .find(Metric)
          .props().data![0][0]!;

      const configNoPrefix = getMetricConfig({
        ...config,
        metric: { ...config.metric, subtitle: 'subtitle', secondaryPrefix: undefined },
        dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
      });

      expect(configNoPrefix!.extra).toEqual(
        <span>
          {table.columns.find((col) => col.id === minPriceColumnId)!.name}
          {` number-13.6328125`}
        </span>
      );

      const configWithPrefix = getMetricConfig({
        ...config,
        metric: { ...config.metric, subtitle: 'subtitle', secondaryPrefix: 'secondary prefix' },
        dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
      });

      expect(configWithPrefix!.extra).toEqual(
        <span>
          {'secondary prefix'}
          {` number-13.6328125`}
        </span>
      );

      expect(configWithPrefix).toMatchInlineSnapshot(`
        Object {
          "color": "#ffffff",
          "extra": <span>
            secondary prefix
             number-13.6328125
          </span>,
          "icon": [Function],
          "subtitle": "subtitle",
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });

    it('should display progress bar if min and max provided', () => {
      const getConfig = (max?: string, direction: LayoutDirection = 'vertical') =>
        shallow(
          <MetricVis
            config={{
              ...config,
              metric: {
                ...config.metric,
                progressDirection: direction,
              },
              dimensions: {
                ...config.dimensions,
                max,
              },
            }}
            data={table}
            {...defaultProps}
          />
        )
          .find(Metric)
          .props().data![0][0]!;

      expect(getConfig(undefined)).not.toHaveProperty('domainMax');
      expect(getConfig(undefined)).not.toHaveProperty('progressBarDirection');

      expect(getConfig('foobar')).not.toHaveProperty('domainMax');
      expect(getConfig('foobar')).not.toHaveProperty('progressBarDirection');

      const configWithProgress = getConfig(basePriceColumnId) as MetricWProgress;

      expect(configWithProgress.domainMax).toEqual(table.rows[0][basePriceColumnId]);
      expect(configWithProgress.progressBarDirection).toBe('vertical');

      expect(configWithProgress).toMatchInlineSnapshot(`
        Object {
          "color": "#ffffff",
          "domainMax": 28.984375,
          "extra": <span />,
          "icon": [Function],
          "progressBarDirection": "vertical",
          "subtitle": undefined,
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);

      expect(
        (getConfig(basePriceColumnId, 'horizontal') as MetricWProgress).progressBarDirection
      ).toBe('horizontal');
    });

    it('should configure trendline if provided', () => {
      const trends = {
        [DEFAULT_TRENDLINE_NAME]: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
          { x: 5, y: 6 },
          { x: 7, y: 8 },
        ],
      };

      const tileConfig = shallow(
        <MetricVis
          config={{
            ...config,
            metric: {
              ...config.metric,
              trends,
            },
            dimensions: {
              ...config.dimensions,
              breakdownBy: undefined,
            },
          }}
          data={table}
          {...defaultProps}
        />
      )
        .find(Metric)
        .props().data![0][0]! as MetricWTrend;

      expect(tileConfig.trend).toEqual(trends[DEFAULT_TRENDLINE_NAME]);
      expect(tileConfig.trendShape).toEqual('area');
    });

    it('should display multi-values non-numeric values formatted and without quotes', () => {
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
      const component = shallow(<MetricVis config={config} data={newTable} {...defaultProps} />);

      const [[visConfig]] = component.find(Metric).props().data!;

      expect(visConfig!.value).toMatchInlineSnapshot(
        `
        Array [
          "text-28.984375",
          "text-100",
        ]
      `
      );
    });

    it('should display multi-values numeric values formatted and without quotes', () => {
      const newTable = {
        ...table,
        rows: table.rows.map((row) => ({
          ...row,
          [basePriceColumnId]: [row[basePriceColumnId], 100],
          [minPriceColumnId]: [row[minPriceColumnId], 10],
        })),
      };
      const component = shallow(<MetricVis config={config} data={newTable} {...defaultProps} />);

      const [[visConfig]] = component.find(Metric).props().data!;

      expect(visConfig!.value).toMatchInlineSnapshot(
        `
        Array [
          "number-28.984375",
          "number-100",
        ]
      `
      );
    });
  });

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

    it('should render a grid if breakdownBy dimension supplied', () => {
      const component = shallow(<MetricVis config={config} data={table} {...defaultProps} />);

      const { data } = component.find(Metric).props();

      expect(data).toBeDefined();
      expect(data?.flat().length).toBe(table.rows.length);

      const visConfig = data![0];

      expect(visConfig).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "#ffffff",
            "extra": <span />,
            "icon": undefined,
            "subtitle": "Median products.base_price",
            "title": "terms-Friday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#ffffff",
            "extra": <span />,
            "icon": undefined,
            "subtitle": "Median products.base_price",
            "title": "terms-Wednesday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#ffffff",
            "extra": <span />,
            "icon": undefined,
            "subtitle": "Median products.base_price",
            "title": "terms-Saturday",
            "value": 25.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#ffffff",
            "extra": <span />,
            "icon": undefined,
            "subtitle": "Median products.base_price",
            "title": "terms-Sunday",
            "value": 25.784375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#ffffff",
            "extra": <span />,
            "icon": undefined,
            "subtitle": "Median products.base_price",
            "title": "terms-Thursday",
            "value": 25.348011363636363,
            "valueFormatter": [Function],
          },
        ]
      `);
    });

    it('should display secondary prefix or secondary metric', () => {
      const componentWithSecondaryDimension = shallow(
        <MetricVis
          config={{
            ...config,
            dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
            // secondary prefix included to make sure it's overridden
            metric: { ...config.metric, secondaryPrefix: 'howdy' },
          }}
          data={table}
          {...defaultProps}
        />
      );

      expect(
        componentWithSecondaryDimension
          .find(Metric)
          .props()
          .data?.[0].map((datum) => datum?.extra)
      ).toMatchInlineSnapshot(`
        Array [
          <span>
            howdy
             number-13.6328125
          </span>,
          <span>
            howdy
             number-13.639539930555555
          </span>,
          <span>
            howdy
             number-13.34375
          </span>,
          <span>
            howdy
             number-13.4921875
          </span>,
          <span>
            howdy
             number-13.34375
          </span>,
        ]
      `);

      const componentWithExtraText = shallow(
        <MetricVis
          config={{
            ...config,
            metric: { ...config.metric, secondaryPrefix: 'howdy' },
          }}
          data={table}
          {...defaultProps}
        />
      );

      expect(
        componentWithExtraText
          .find(Metric)
          .props()
          .data?.[0].map((datum) => datum?.extra)
      ).toMatchInlineSnapshot(`
        Array [
          <span>
            howdy
          </span>,
          <span>
            howdy
          </span>,
          <span>
            howdy
          </span>,
          <span>
            howdy
          </span>,
          <span>
            howdy
          </span>,
        ]
      `);
    });

    it('should respect maxCols and minTiles', () => {
      const getConfigs = (maxCols?: number, minTiles?: number) =>
        shallow(
          <MetricVis
            config={{
              ...config,
              metric: {
                ...config.metric,
                ...(maxCols ? { maxCols } : {}),
                minTiles,
              },
            }}
            data={table}
            {...defaultProps}
          />
        )
          .find(Metric)
          .props().data!;

      const configsWithDefaults = getConfigs(undefined, undefined);
      expect(configsWithDefaults.length).toBe(2);
      expect(configsWithDefaults[0].length).toBe(5);

      const configsWithCustomCols = getConfigs(2, undefined);
      expect(configsWithCustomCols.length).toBe(3);
      expect(configsWithCustomCols[0].length).toBe(2);
      expect(configsWithCustomCols[1].length).toBe(2);
      expect(configsWithCustomCols[2].length).toBe(2);

      const configsWithMinTiles = getConfigs(5, 10);
      expect(configsWithMinTiles.length).toBe(2);
      expect(configsWithMinTiles[1].length).toBe(5);
      expect(configsWithMinTiles).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-Thursday",
              "value": 25.348011363636363,
              "valueFormatter": [Function],
            },
          ],
          Array [
            Object {
              "color": "#ffffff",
              "extra": <span />,
              "icon": undefined,
              "subtitle": "Median products.base_price",
              "title": "terms-__other__",
              "value": 24.984375,
              "valueFormatter": [Function],
            },
            undefined,
            undefined,
            undefined,
            undefined,
          ],
        ]
      `);
    });

    it('should display progress bar if max provided', () => {
      expect(
        shallow(
          <MetricVis
            config={{
              ...config,
              metric: {
                ...config.metric,
              },
              dimensions: {
                ...config.dimensions,
                max: basePriceColumnId,
              },
            }}
            data={table}
            {...defaultProps}
          />
        )
          .find(Metric)
          .props().data
      ).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "color": "#ffffff",
              "domainMax": 28.984375,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "domainMax": 28.984375,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "domainMax": 25.984375,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "domainMax": 25.784375,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#ffffff",
              "domainMax": 25.348011363636363,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-Thursday",
              "value": 25.348011363636363,
              "valueFormatter": [Function],
            },
          ],
          Array [
            Object {
              "color": "#ffffff",
              "domainMax": 24.984375,
              "extra": <span />,
              "icon": undefined,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "terms-__other__",
              "value": 24.984375,
              "valueFormatter": [Function],
            },
          ],
        ]
      `);
    });
    it('should configure trendlines if provided', () => {
      // Raw values here, not formatted
      const trends: Record<string, MetricWTrend['trend']> = {
        Friday: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        Wednesday: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        Saturday: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        Sunday: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        Thursday: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        __other__: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
        ],
        // this one shouldn't show up!
        [DEFAULT_TRENDLINE_NAME]: [
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
          { x: faker.random.number(), y: faker.random.number() },
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

    it('renders with no data', () => {
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

  it('should constrain dimensions in edit mode', () => {
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

  it('should report render complete', () => {
    const renderCompleteSpy = jest.fn();
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
        renderComplete={renderCompleteSpy}
      />
    );
    component.find(Settings).props().onRenderChange!(false);

    expect(renderCompleteSpy).not.toHaveBeenCalled();

    component.find(Settings).props().onRenderChange!(true);

    expect(renderCompleteSpy).toHaveBeenCalledTimes(1);
  });

  it('should convert null values to NaN', () => {
    const metricId = faker.random.word();

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

    const metricConfig = shallow(
      <MetricVis
        config={{
          metric: {
            ...defaultMetricParams,
          },
          dimensions: {
            metric: metricId,
          },
        }}
        data={tableWNull}
        {...defaultProps}
      />
    )
      .find(Metric)
      .props().data![0][0]! as MetricWNumber;

    expect(metricConfig.value).toBeNaN();
  });

  describe('filter events', () => {
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

  describe('coloring', () => {
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
                  colors: [],
                  gradient: true,
                  stops: [],
                  range: 'number',
                  rangeMin: 2,
                  rangeMax: 10,
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
          palette: CustomPaletteState,
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
                range: 'percent',
                // the rest of these params don't matter
                colors: [],
                gradient: false,
                stops: [],
                rangeMin: 2,
                rangeMax: 10,
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

  describe('metric value formatting', () => {
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

  describe('overrides', () => {
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
