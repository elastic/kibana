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
import MetricVis, { MetricVisComponentProps } from './metric_vis';
import { LayoutDirection, Metric, MetricWProgress, Settings } from '@elastic/charts';
import { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import numeral from '@elastic/numeral';
import { HtmlAttributes } from 'csstype';

const mockDeserialize = jest.fn(() => ({
  getConverterFor: jest.fn(() => () => 'formatted duration'),
}));

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
      [dayOfWeekColumnId]: 'Monday',
      [basePriceColumnId]: 24.984375,
      [minPriceColumnId]: 13.242513020833334,
    },
  ],
};

describe('MetricVisComponent', function () {
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
      const component = shallow(
        <MetricVis config={config} data={table} renderComplete={() => {}} />
      );

      const { data } = component.find(Metric).props();

      expect(data).toBeDefined();
      expect(data?.length).toBe(1);

      const visConfig = data![0][0]!;

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#343741",
          "extra": <span />,
          "subtitle": undefined,
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });
    it('should display subtitle and extra text', () => {
      const component = shallow(
        <MetricVis
          config={{
            ...config,
            metric: { ...config.metric, subtitle: 'subtitle', extraText: 'extra text' },
          }}
          data={table}
          renderComplete={() => {}}
        />
      );

      const [[visConfig]] = component.find(Metric).props().data!;

      expect(visConfig!.subtitle).toBe('subtitle');
      expect(visConfig!.extra).toEqual(<span>extra text</span>);

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#343741",
          "extra": <span>
            extra text
          </span>,
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
            metric: { ...config.metric, subtitle: 'subtitle', extraText: 'extra text' },
            dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
          }}
          data={table}
          renderComplete={() => {}}
        />
      );

      const [[visConfig]] = component.find(Metric).props().data!;

      // overrides subtitle and extra text
      expect(visConfig!.subtitle).toBe(table.columns[2].name);
      expect(visConfig!.extra).toEqual(<span>13.63</span>);

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#343741",
          "extra": <span>
            13.63
          </span>,
          "subtitle": "Median products.min_price",
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
                progressMax: max,
              },
            }}
            data={table}
            renderComplete={() => {}}
          />
        )
          .find(Metric)
          .props().data![0][0]!;

      expect(getConfig(undefined)).not.toHaveProperty('domain');
      expect(getConfig(undefined)).not.toHaveProperty('progressBarDirection');

      expect(getConfig('foobar')).not.toHaveProperty('domain');
      expect(getConfig('foobar')).not.toHaveProperty('progressBarDirection');

      const configWithProgress = getConfig(basePriceColumnId) as MetricWProgress;

      expect(configWithProgress.domain).toEqual({ min: 0, max: table.rows[0][basePriceColumnId] });
      expect(configWithProgress.progressBarDirection).toBe('vertical');

      expect(configWithProgress).toMatchInlineSnapshot(`
        Object {
          "color": "#343741",
          "domain": Object {
            "max": 28.984375,
            "min": 0,
          },
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

    it('should fetch color from palette if provided', () => {
      const colorFromPalette = 'color-from-palette';

      mockGetColorForValue.mockReturnValue(colorFromPalette);

      const component = shallow(
        <MetricVis
          config={{
            ...config,
            metric: {
              ...config.metric,
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
          renderComplete={() => {}}
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
              "max": 10,
              "min": 2,
            },
          ],
        ]
      `);
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
      const component = shallow(
        <MetricVis config={config} data={table} renderComplete={() => {}} />
      );

      const { data } = component.find(Metric).props();

      expect(data).toBeDefined();
      expect(data?.flat().length).toBe(table.rows.length);

      const visConfig = data![0];

      expect(visConfig).toMatchInlineSnapshot(`
        Array [
          Object {
            "color": "#343741",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Friday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#343741",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Wednesday",
            "value": 28.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#343741",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Saturday",
            "value": 25.984375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#343741",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Sunday",
            "value": 25.784375,
            "valueFormatter": [Function],
          },
          Object {
            "color": "#343741",
            "extra": <span />,
            "subtitle": "Median products.base_price",
            "title": "Thursday",
            "value": 25.348011363636363,
            "valueFormatter": [Function],
          },
        ]
      `);
    });

    it('should display extra text or secondary metric', () => {
      const componentWithSecondaryDimension = shallow(
        <MetricVis
          config={{
            ...config,
            dimensions: { ...config.dimensions, secondaryMetric: minPriceColumnId },
            // extra text included to make sure it's overridden
            metric: { ...config.metric, extraText: 'howdy' },
          }}
          data={table}
          renderComplete={() => {}}
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
            13.63
          </span>,
          <span>
            13.64
          </span>,
          <span>
            13.34
          </span>,
          <span>
            13.49
          </span>,
          <span>
            13.34
          </span>,
        ]
      `);

      const componentWithExtraText = shallow(
        <MetricVis
          config={{
            ...config,
            metric: { ...config.metric, extraText: 'howdy' },
          }}
          data={table}
          renderComplete={() => {}}
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
            renderComplete={() => {}}
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
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Thursday",
              "value": 25.348011363636363,
              "valueFormatter": [Function],
            },
          ],
          Array [
            Object {
              "color": "#343741",
              "extra": <span />,
              "subtitle": "Median products.base_price",
              "title": "Monday",
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
                progressMax: basePriceColumnId,
              },
            }}
            data={table}
            renderComplete={() => {}}
          />
        )
          .find(Metric)
          .props().data
      ).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "color": "#343741",
              "domain": Object {
                "max": 28.984375,
                "min": 0,
              },
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Friday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "domain": Object {
                "max": 28.984375,
                "min": 0,
              },
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Wednesday",
              "value": 28.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "domain": Object {
                "max": 25.984375,
                "min": 0,
              },
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Saturday",
              "value": 25.984375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "domain": Object {
                "max": 25.784375,
                "min": 0,
              },
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Sunday",
              "value": 25.784375,
              "valueFormatter": [Function],
            },
            Object {
              "color": "#343741",
              "domain": Object {
                "max": 25.348011363636363,
                "min": 0,
              },
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
              "color": "#343741",
              "domain": Object {
                "max": 24.984375,
                "min": 0,
              },
              "extra": <span />,
              "progressBarDirection": "vertical",
              "subtitle": "Median products.base_price",
              "title": "Monday",
              "value": 24.984375,
              "valueFormatter": [Function],
            },
          ],
        ]
      `);
    });
  });

  it('should respect size constraints', () => {
    const getContainerStyles = (width?: number, height?: number) =>
      (
        shallow(
          <MetricVis
            data={table}
            renderComplete={() => {}}
            config={{
              metric: {
                progressDirection: 'vertical',
                maxCols: 5,
                maxTileWidth: width,
                maxTileHeight: height,
              },
              dimensions: {
                metric: basePriceColumnId,
              },
            }}
          />
        )
          .find('div')
          .props() as HtmlAttributes & { css: { styles: string } }
      ).css.styles;

    expect(getContainerStyles()).toMatchInlineSnapshot(`
      "
              height: 100%;
              width: 100%;
              max-height: 100%;
              max-width: 100%;
            "
    `);

    expect(getContainerStyles(240, 1200)).toMatchInlineSnapshot(`
      "
              height: 1200px;
              width: 240px;
              max-height: 100%;
              max-width: 100%;
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
        renderComplete={renderCompleteSpy}
      />
    );
    component.find(Settings).props().onRenderChange!(false);

    expect(renderCompleteSpy).not.toHaveBeenCalled();

    component.find(Settings).props().onRenderChange!(true);

    expect(renderCompleteSpy).toHaveBeenCalledTimes(1);
  });

  describe('metric value formatting', () => {
    const getFormattedMetrics = (
      value: number,
      secondaryValue: number,
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
          renderComplete={() => {}}
        />
      );

      const {
        value: primaryMetric,
        valueFormatter,
        extra,
      } = component.find(Metric).props().data?.[0][0]!;

      return { primary: valueFormatter(primaryMetric), secondary: extra?.props.children };
    };

    it('correctly formats plain numbers', () => {
      const { primary, secondary } = getFormattedMetrics(394.2393, 983123.984, { id: 'number' });
      expect(primary).toBe('394.24');
      expect(secondary).toBe('983.12K');
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
