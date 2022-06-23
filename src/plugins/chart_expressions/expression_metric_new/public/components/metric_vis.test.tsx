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
import { LayoutDirection, Metric, MetricWProgress } from '@elastic/charts';

jest.mock('../services', () => ({
  // getFormatService: () => {
  //   // eslint-disable-next-line @typescript-eslint/no-var-requires
  //   const { getFormatService } = require('../__mocks__/services');
  //   return getFormatService();
  // },
  getPaletteService: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getPaletteService } = require('../__mocks__/palette_service');
    return getPaletteService();
  },
  getThemeService: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getThemeService } = require('../__mocks__/theme_service');
    return getThemeService();
  },
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
          "color": "#5e5e5e",
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
          "color": "#5e5e5e",
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
      expect(visConfig!.extra).toEqual(<span>13.633</span>);

      expect(visConfig).toMatchInlineSnapshot(`
        Object {
          "color": "#5e5e5e",
          "extra": <span>
            13.633
          </span>,
          "subtitle": "Median products.min_price",
          "title": "Median products.base_price",
          "value": 28.984375,
          "valueFormatter": [Function],
        }
      `);
    });
    it('should display progress bar if min and max provided', () => {
      const getConfig = (min?: number, max?: number, direction: LayoutDirection = 'vertical') =>
        shallow(
          <MetricVis
            config={{
              ...config,
              metric: {
                ...config.metric,
                progressMin: min,
                progressMax: max,
                progressDirection: direction,
              },
            }}
            data={table}
            renderComplete={() => {}}
          />
        )
          .find(Metric)
          .props().data![0][0]!;

      expect(getConfig(0, undefined)).not.toHaveProperty('domain');
      expect(getConfig(0, undefined)).not.toHaveProperty('progressBarDirection');

      expect(getConfig(undefined, 30)).not.toHaveProperty('domain');
      expect(getConfig(undefined, 30)).not.toHaveProperty('progressBarDirection');

      const configWithProgress = getConfig(0, 30) as MetricWProgress;

      expect(configWithProgress.domain).toEqual({ min: 0, max: 30 });
      expect(configWithProgress.progressBarDirection).toBe('vertical');

      expect(configWithProgress).toMatchInlineSnapshot(`
        Object {
          "color": "#5e5e5e",
          "domain": Object {
            "max": 30,
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

      expect((getConfig(0, 30, 'horizontal') as MetricWProgress).progressBarDirection).toBe(
        'horizontal'
      );
    });
    it('should fetch color from palette if provided', () => {});
  });

  describe('metric grid', () => {
    it('should render a grid if breakdownBy dimension supplied', () => {});
    it('should display extra text or secondary metric', () => {});
    it('should respect maxCols and minTiles', () => {});
    it('should display progress bar if min and max provided', () => {});
    it('should fetch color from palette if provided', () => {});
  });
});
