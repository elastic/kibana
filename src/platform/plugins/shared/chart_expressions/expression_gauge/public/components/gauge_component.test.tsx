/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ColorStop } from '@kbn/coloring';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { DatatableColumn, DatatableColumnMeta, DatatableRow } from '@kbn/expressions-plugin/common';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import {
  GaugeRenderProps,
  GaugeArguments,
  GaugeLabelMajorModes,
  GaugeTicksPositions,
  GaugeColorModes,
} from '../../common';
import GaugeComponent from './gauge_component';
import {
  Chart,
  Bullet,
  Settings,
  BulletProps,
  ColorBandSimpleConfig,
  Color,
} from '@elastic/charts';
import { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common';

const numberColumn = (id = 'metric-accessor'): DatatableColumn => ({
  id,
  name: 'Count of records',
  meta: {
    type: 'number',
    index: 'kibana_sample_data_ecommerce',
    params: {
      id: 'number',
    },
  },
});

const { theme: chartsThemeService, palettes: paletteThemeService } =
  chartPluginMock.createSetupContract();
const formatService = fieldFormatsServiceMock.createStartContract();
const args: GaugeArguments = {
  labelMajor: 'Gauge',
  metric: 'metric-accessor',
  min: '',
  max: '',
  goal: '',
  shape: 'verticalBullet',
  colorMode: GaugeColorModes.NONE,
  ticksPosition: GaugeTicksPositions.AUTO,
  labelMajorMode: GaugeLabelMajorModes.AUTO,
  centralMajorMode: GaugeLabelMajorModes.NONE,
};

const createData = (
  row: DatatableRow = { 'metric-accessor': 3, 'min-accessor': 0, 'max-accessor': 10 }
): Datatable => {
  return {
    type: 'datatable',
    rows: [row],
    columns: Object.keys(row).map((key) => numberColumn(key)),
  };
};

const mockState = new Map();
const uiState = {
  get: jest
    .fn()
    .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
  set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
  emit: jest.fn(),
  setSilent: jest.fn(),
} as any;

describe('GaugeComponent', function () {
  let wrapperProps: GaugeRenderProps;

  beforeAll(async () => {
    wrapperProps = {
      canNavigateToLens: false,
      data: createData(),
      chartsThemeService,
      args,
      formatFactory: formatService.deserialize,
      paletteService: await paletteThemeService.getPalettes(),
      uiState,
      renderComplete: jest.fn(),
      setChartSize: jest.fn(),
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chart', () => {
    const component = shallowWithIntl(<GaugeComponent {...wrapperProps} />);
    expect(component.find(Chart)).toMatchSnapshot();
  });

  it('returns null when metric is not provided', async () => {
    const customProps: GaugeRenderProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metric: undefined,
        min: 'min-accessor',
        max: 'max-accessor',
      },
      data: createData({ 'min-accessor': 0, 'max-accessor': 10 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.isEmptyRender()).toBe(true);
  });

  it('shows empty placeholder when minimum accessor equals maximum accessor', async () => {
    const customProps: GaugeRenderProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metric: 'metric-accessor',
        min: 'min-accessor',
        max: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 0, 'min-accessor': 0, 'max-accessor': 0 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.find('EmptyPlaceholder')).toHaveLength(1);
  });
  it('shows empty placeholder when minimum accessor value is greater maximum accessor value', async () => {
    const customProps: GaugeRenderProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        metric: 'metric-accessor',
        min: 'min-accessor',
        max: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 0, 'min-accessor': 0, 'max-accessor': -10 }),
    };
    const component = shallowWithIntl(<GaugeComponent {...customProps} />);
    expect(component.find('EmptyPlaceholder')).toHaveLength(1);
  });
  it('when metric value is bigger than max, it takes maximum value', () => {
    const customProps: GaugeRenderProps = {
      ...wrapperProps,
      args: {
        ...wrapperProps.args,
        ticksPosition: GaugeTicksPositions.BANDS,
        metric: 'metric-accessor',
        min: 'min-accessor',
        max: 'max-accessor',
      },
      data: createData({ 'metric-accessor': 12, 'min-accessor': 0, 'max-accessor': 10 }),
    } as GaugeRenderProps;
    const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
    const datum = bullet.prop<BulletProps['data']>('data')[0]?.[0];
    expect(datum?.value).toEqual(12);
  });

  describe('labelMajor and labelMinor settings', () => {
    it('displays no labelMajor and no labelMinor when no passed', () => {
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.NONE,
          labelMinor: '',
        },
      };
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const datum = bullet.prop<BulletProps['data']>('data')[0]?.[0];
      expect(datum?.title).toEqual('');
      expect(datum?.subtitle).toEqual('');
    });
    it('displays custom labelMajor and labelMinor when passed', () => {
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.CUSTOM,
          labelMajor: 'custom labelMajor',
          labelMinor: 'custom labelMinor',
        },
      };
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const datum = bullet.prop<BulletProps['data']>('data')[0]?.[0];
      expect(datum?.title).toEqual('custom labelMajor');
      expect(datum?.subtitle).toEqual('custom labelMinor');
    });
    it('displays auto labelMajor', () => {
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.AUTO,
          labelMajor: '',
        },
      };
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const datum = bullet.prop<BulletProps['data']>('data')[0]?.[0];
      expect(datum?.title).toEqual('Count of records');
    });
  });

  describe('ticks and color bands', () => {
    it('sets proper color bands and ticks on color bands for values smaller than maximum', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [1, 2, 3] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 4,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const datum = bullet.prop<BulletProps['data']>('data')[0]?.[0];
      expect((datum?.ticks as () => number[])?.()).toEqual([0, 1, 2, 3, 4, 10]);
      const colorBands = bullet.prop<Color[]>('colorBands');
      expect(colorBands).toEqual(['#CAD3E2', '#CAD3E2']);
    });
    it('sets proper color bands if palette steps are smaller than minimum', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [-10, -5, 0] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 4,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<Color[]>('colorBands');
      expect(colorBands).toEqual(['#CAD3E2', '#CAD3E2']);
    });
    it('sets proper color bands if percent palette steps are smaller than 0', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [-20, -60, 80],
          range: 'percent',
          rangeMin: 0,
          rangeMax: 100,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<Color[]>('colorBands');
      expect(colorBands).toEqual(['#CAD3E2', '#CAD3E2']);
    });
    it('doesnt set bands for values differing <10%', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [1, 1.5, 3] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 10,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<Color[]>('colorBands');
      expect(colorBands).toEqual(['#CAD3E2', '#CAD3E2']);
    });
    it('sets proper color bands for values greater than maximum', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [10, 20, 30, 31] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 30,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<Color[]>('colorBands');
      expect(colorBands).toEqual(['#CAD3E2', '#CAD3E2']);
    });
    it('passes number bands from color palette with no stops defined', () => {
      const palette = {
        type: 'palette' as const,
        name: 'gray',
        params: {
          colors: ['#aaa', '#bbb'],
          gradient: false,
          stops: [],
          range: 'number',
          rangeMin: 0,
          rangeMax: 10,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: GaugeColorModes.PALETTE,
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<ColorBandSimpleConfig>('colorBands');
      expect(colorBands?.steps).toEqual([0, 5, 10]);
      expect(colorBands?.colors).toEqual(['rgba(255,255,255,0)', 'rgba(255,255,255,0)']);
    });
    it('passes percent bands from color palette', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [20, 60, 80],
          range: 'percent',
          rangeMin: 0,
          rangeMax: 100,
        },
      };
      const customProps: GaugeRenderProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          colorMode: GaugeColorModes.PALETTE,
          palette,
          ticksPosition: GaugeTicksPositions.BANDS,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
        },
      } as GaugeRenderProps;
      const bullet = shallowWithIntl(<GaugeComponent {...customProps} />).find(Bullet);
      const colorBands = bullet.prop<ColorBandSimpleConfig>('colorBands');
      expect(colorBands?.steps).toEqual([0, 2, 6, 8, 10]);
      expect(colorBands?.colors).toEqual(['blue', 'blue', 'blue', 'blue']);
    });
  });

  describe('overrides', () => {
    it('should apply overrides to the settings component', () => {
      const component = shallowWithIntl(
        <GaugeComponent
          {...wrapperProps}
          overrides={{ settings: { onBrushEnd: 'ignore', ariaUseDefaultSummary: true } }}
        />
      );

      const settingsComponent = component.find(Settings);
      expect(settingsComponent.prop('onBrushEnd')).toBeUndefined();
      expect(settingsComponent.prop('ariaUseDefaultSummary')).toEqual(true);
    });
  });

  describe('formatting', () => {
    let baseFormattingProps: GaugeRenderProps;
    const metricFormat: ExpressionValueVisDimension['format'] = {
      id: 'bytes',
    };
    const tableFormatParams = {
      id: 'number',
      params: {
        pattern: '0,00000',
      },
    };
    const metricMetaParams: DatatableColumnMeta = {
      type: 'number',
      params: {
        id: 'test',
        params: {
          pattern: '000,000.00',
        },
      },
    };
    const createColumnsWithMetricParams = (params?: DatatableColumnMeta['params']) =>
      wrapperProps.data.columns.map((c) =>
        c.id !== 'metric-accessor'
          ? c
          : {
              ...c,
              meta: {
                ...c.meta,
                params,
              },
            }
      );

    beforeAll(() => {
      baseFormattingProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: {
            ...(wrapperProps.args.metric as ExpressionValueVisDimension),
            accessor: {
              id: 'metric-accessor',
              name: 'metric-accessor',
              meta: metricMetaParams,
            },
            format: metricFormat,
          },
        },
        data: {
          ...wrapperProps.data,
          columns: createColumnsWithMetricParams(tableFormatParams),
        },
      };
    });

    it('should use custom metric format params, if provided', () => {
      shallowWithIntl(<GaugeComponent {...baseFormattingProps} />);
      expect(formatService.deserialize).toBeCalledWith(metricFormat);
    });

    it('should use table metric format params, if provided', () => {
      const customProps: GaugeRenderProps = {
        ...baseFormattingProps,
        args: {
          ...baseFormattingProps.args,
          metric: 'metric-accessor',
        },
      };
      shallowWithIntl(<GaugeComponent {...customProps} />);
      expect(formatService.deserialize).toBeCalledWith(tableFormatParams);
    });

    it('should use default metric format params, if no others provided', () => {
      const testParams = {
        id: 'test',
      };
      const customProps: GaugeRenderProps = {
        ...baseFormattingProps,
        args: {
          ...baseFormattingProps.args,
          metric: 'metric-accessor',
        },
        data: {
          ...baseFormattingProps.data,
          columns: createColumnsWithMetricParams(testParams),
        },
      };

      shallowWithIntl(<GaugeComponent {...customProps} />);
      expect(formatService.deserialize).toBeCalledWith(testParams);
    });

    it('should use fallback if no default metric format and no others provided', () => {
      const customProps: GaugeRenderProps = {
        ...baseFormattingProps,
        args: {
          ...baseFormattingProps.args,
          metric: 'metric-accessor',
        },
        data: {
          ...wrapperProps.data,
          columns: createColumnsWithMetricParams(),
        },
      };

      shallowWithIntl(<GaugeComponent {...customProps} />);
      expect(formatService.deserialize).toBeCalledWith({
        id: 'number',
        params: {
          pattern: '0,0.0',
        },
      });
    });
  });
});
