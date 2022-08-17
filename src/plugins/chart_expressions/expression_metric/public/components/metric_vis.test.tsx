/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Datatable } from '@kbn/expressions-plugin/common';
import { MetricVis, MetricVisComponentProps } from './metric_vis';
import {
  LayoutDirection,
  Metric,
  MetricElementEvent,
  MetricWProgress,
  Settings,
} from '@elastic/charts';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import numeral from '@elastic/numeral';
import { HtmlAttributes } from 'csstype';
import { CustomPaletteState } from '@kbn/charts-plugin/common/expressions/palette/types';
import { DimensionsVisParam } from '../../common';
import { euiThemeVars } from '@kbn/ui-theme';

const mockDeserialize = jest.fn((params) => {
  const converter =
    params.id === 'terms'
      ? (val: string) => (val === '__other__' ? 'Other' : val)
      : params.id === 'string'
      ? (val: string) => (val === '' ? '(empty)' : val)
      : () => 'formatted duration';
  return { getConverterFor: jest.fn(() => converter) };
});

const mockGetColorForValue = jest.fn<undefined | string, any>(() => undefined);

const mockLookupCurrentLocale = jest.fn(() => 'en');

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getThemeService } = require('../__mocks__/theme_service');
    return getThemeService();
  },
  getUiSettingsService: () => {
    return {
      get: mockLookupCurrentLocale,
    };
  },
}));

jest.mock('@kbn/field-formats-plugin/common', () => ({
  FORMATS_UI_SETTINGS: {
    FORMAT_NUMBER_DEFAULT_LOCALE: 'format_number_default_locale',
  },
}));

jest.mock('@elastic/numeral', () => ({
  language: jest.fn(() => 'en'),
  languageData: jest.fn(() => ({
    currency: {
      symbol: '$',
    },
  })),
}));

type Props = MetricVisComponentProps;

const dayOfWeekColumnId = 'col-0-0';
const basePriceColumnId = 'col-1-1';
const minPriceColumnId = 'col-2-2';

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
} as Pick<MetricVisComponentProps, 'renderComplete' | 'fireEvent' | 'filterable' | 'renderMode'>;

describe('MetricVisComponent', function () {
  afterEach(() => {
    mockDeserialize.mockClear();
  });

  describe('single metric', () => {
    const config: Props['config'] = {
      metric: {
        progressDirection: 'vertical',
        maxCols: 5,
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
          "color": "#f5f7fa",
          "extra": <span />,
          "subtitle": undefined,
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });
    it('should display subtitle and secondary prefix', () => {
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

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#f5f7fa",
          "extra": <span />,
          "subtitle": "subtitle",
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });
    it('should display secondary metric', () => {
      const component = shallow(
        <MetricVis
          config={{
            ...config,
            metric: { ...config.metric, subtitle: 'subtitle', secondaryPrefix: 'secondary prefix' },
            dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
          }}
          data={table}
          {...defaultProps}
        />
      );

      const [[visConfig]] = component.find(Metric).props().data!;

      expect(visConfig!.extra).toEqual(
        <span>
          {'secondary prefix'}
          {' ' + 13.63}
        </span>
      );

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#f5f7fa",
          "extra": <span>
            secondary prefix
             13.63
          </span>,
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
          "color": "#f5f7fa",
          "domainMax": 28.984375,
          "extra": <span />,
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
  });

  describe('metric grid', () => {
    const config: Props['config'] = {
      metric: {
        progressDirection: 'vertical',
        maxCols: 5,
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
            "color": "#f5f7fa",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Friday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#f5f7fa",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Wednesday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#f5f7fa",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Saturday",
            "value": 25.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#f5f7fa",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Sunday",
            "value": 25.784375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#f5f7fa",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Thursday",
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
             13.63
          </span>,
          <span>
            howdy
             13.64
          </span>,
          <span>
            howdy
             13.34
          </span>,
          <span>
            howdy
             13.49
          </span>,
          <span>
            howdy
             13.34
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
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Thursday",
              "value": 25.348011363636363,
              "valueFormatter": [Function],
            },
          ],
          Array [
            Object {
              "color": "#f5f7fa",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Other",
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
              "color": "#f5f7fa",
              "domainMax": 28.984375,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "domainMax": 28.984375,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "domainMax": 25.984375,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "domainMax": 25.784375,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#f5f7fa",
              "domainMax": 25.348011363636363,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Thursday",
              "value": 25.348011363636363,
              "valueFormatter": [Function],
            },
          ],
          Array [
            Object {
              "color": "#f5f7fa",
              "domainMax": 24.984375,
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Other",
              "value": 24.984375,
              "valueFormatter": [Function],
            },
          ],
        ]
      `);
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

  describe('rendering with no data', () => {});

  it('should constrain dimensions in edit mode', () => {
    const getContainerStyles = (editMode: boolean, multipleTiles: boolean) =>
      (
        shallow(
          <MetricVis
            data={table}
            config={{
              metric: {
                progressDirection: 'vertical',
                maxCols: 5,
              },
              dimensions: {
                metric: basePriceColumnId,
                breakdownBy: multipleTiles ? dayOfWeekColumnId : undefined,
              },
            }}
            {...defaultProps}
            renderMode={editMode ? 'edit' : 'view'}
          />
        )
          .find('div')
          .at(0)
          .props() as HtmlAttributes & { css: { styles: string } }
      ).css.styles;

    expect(getContainerStyles(false, false)).toMatchInlineSnapshot(`
      "
              height: 100%;
              width: 100%;
              max-height: 100%;
              max-width: 100%;
              overflow-y: auto;
            "
    `);

    expect(getContainerStyles(true, false)).toMatchInlineSnapshot(`
      "
              height: 300px;
              width: 300px;
              max-height: 100%;
              max-width: 100%;
              overflow-y: auto;
            "
    `);

    expect(getContainerStyles(true, true)).toMatchInlineSnapshot(`
      "
              height: 400px;
              width: 1000px;
              max-height: 100%;
              max-width: 100%;
              overflow-y: auto;
            "
    `);
  });

  it('should report render complete', () => {
    const renderCompleteSpy = jest.fn();
    const component = shallow(
      <MetricVis
        config={{
          metric: {
            progressDirection: 'vertical',
            maxCols: 5,
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

  describe('filter events', () => {
    const fireEventSpy = jest.fn();

    afterEach(() => fireEventSpy.mockClear());

    const fireFilter = (event: MetricElementEvent, filterable: boolean, breakdown?: boolean) => {
      const component = shallow(
        <MetricVis
          config={{
            metric: {
              progressDirection: 'vertical',
              maxCols: 5,
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
            },
          ],
        },
      });
    });

    it('should do nothing if primary metric is not filterable', () => {
      const event: MetricElementEvent = {
        type: 'metricElementEvent',
        rowIndex: 1,
        columnIndex: 0,
      };

      fireFilter(event, false, true);

      expect(fireEventSpy).not.toHaveBeenCalled();
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
                progressDirection: 'vertical',
                maxCols: 5,
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
                "max": 28.984375,
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
                  palette,
                  progressDirection: 'vertical',
                  maxCols: 5,
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
                progressDirection: 'vertical',
                maxCols: 5,
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
                progressDirection: 'vertical',
                maxCols: 5,
                color: undefined,
                palette: undefined,
              },
            }}
            data={table}
            {...defaultProps}
          />
        );

        const [[datum]] = component.find(Metric).props().data!;

        expect(datum!.color).toBe(euiThemeVars.euiColorLightestShade);
        expect(mockGetColorForValue).not.toHaveBeenCalled();
      });
    });
  });

  describe('metric value formatting', () => {
    const getFormattedMetrics = (
      value: number | string,
      secondaryValue: number | string,
      fieldFormatter: SerializedFieldFormat<SerializableRecord>
    ) => {
      const config: Props['config'] = {
        metric: {
          progressDirection: 'vertical',
          maxCols: 5,
        },
        dimensions: {
          metric: '1',
          secondaryMetric: '2',
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
              {
                id: '2',
                name: '',
                meta: { type: 'number', params: fieldFormatter },
              },
            ],
            rows: [{ '1': value, '2': secondaryValue }],
          }}
          {...defaultProps}
        />
      );

      const {
        value: primaryMetric,
        valueFormatter,
        extra,
      } = component.find(Metric).props().data?.[0][0]!;

      return { primary: valueFormatter(primaryMetric), secondary: extra?.props.children[1] };
    };

    it('correctly formats plain numbers', () => {
      const { primary, secondary } = getFormattedMetrics(394.2393, 983123.984, { id: 'number' });
      expect(primary).toBe('394.24');
      expect(secondary).toBe('983.12K');
    });

    it('correctly formats strings', () => {
      const { primary, secondary } = getFormattedMetrics('', '', { id: 'string' });
      expect(primary).toBe('(empty)');
      expect(secondary).toBe('(empty)');
    });

    it('correctly formats currency', () => {
      const { primary, secondary } = getFormattedMetrics(1000.839, 11.2, { id: 'currency' });
      expect(primary).toBe('$1.00K');
      expect(secondary).toBe('$11.20');

      mockLookupCurrentLocale.mockReturnValueOnce('be-nl');
      // @ts-expect-error
      (numeral.languageData as jest.Mock).mockReturnValueOnce({
        currency: {
          symbol: '€',
        },
      });

      const { primary: primaryEuro } = getFormattedMetrics(1000.839, 0, {
        id: 'currency',
      });
      expect(primaryEuro).toBe('1,00 тыс. €');
      // check that we restored the numeral.js state
      expect(numeral.language).toHaveBeenLastCalledWith('en');
    });

    it('correctly formats percentages', () => {
      const { primary, secondary } = getFormattedMetrics(0.23939, 11.2, { id: 'percent' });
      expect(primary).toBe('23.94%');
      expect(secondary).toBe('1.12K%');
    });

    it('correctly formats bytes', () => {
      const base = 1024;

      const { primary: bytesValue } = getFormattedMetrics(base - 1, 0, { id: 'bytes' });
      expect(bytesValue).toBe('1,023 byte');

      const { primary: kiloBytesValue } = getFormattedMetrics(Math.pow(base, 1), 0, {
        id: 'bytes',
      });
      expect(kiloBytesValue).toBe('1 kB');

      const { primary: megaBytesValue } = getFormattedMetrics(Math.pow(base, 2), 0, {
        id: 'bytes',
      });
      expect(megaBytesValue).toBe('1 MB');

      const { primary: moreThanPetaValue } = getFormattedMetrics(Math.pow(base, 6), 0, {
        id: 'bytes',
      });
      expect(moreThanPetaValue).toBe('1,024 PB');
    });

    it('correctly formats durations', () => {
      const { primary, secondary } = getFormattedMetrics(1, 1, {
        id: 'duration',
        params: {
          // the following params should be preserved
          inputFormat: 'minutes',
          // the following params should be overridden
          outputFormat: 'precise',
          outputPrecision: 2,
          useShortSuffix: false,
        },
      });

      expect(primary).toBe('formatted duration');
      expect(secondary).toBe('formatted duration');
      expect(mockDeserialize).toHaveBeenCalledTimes(2);
      expect(mockDeserialize).toHaveBeenCalledWith({
        id: 'duration',
        params: {
          inputFormat: 'minutes',
          outputFormat: 'humanizePrecise',
          outputPrecision: 1,
          useShortSuffix: true,
        },
      });
    });
  });
});
