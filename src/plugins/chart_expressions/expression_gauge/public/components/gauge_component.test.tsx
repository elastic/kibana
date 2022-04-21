/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ColorStop } from '@kbn/coloring';
import { chartPluginMock } from '../../../../charts/public/mocks';
import { fieldFormatsServiceMock } from '../../../../field_formats/public/mocks';
import type { Datatable } from '../../../../expressions/public';
import { DatatableColumn, DatatableRow } from 'src/plugins/expressions/common';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import {
  GaugeRenderProps,
  GaugeArguments,
  GaugeLabelMajorModes,
  GaugeTicksPositions,
  GaugeColorModes,
} from '../../common';
import GaugeComponent from './gauge_component';
import { Chart, Goal } from '@elastic/charts';

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

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

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

const chartsThemeService = chartPluginMock.createSetupContract().theme;
const paletteThemeService = chartPluginMock.createSetupContract().palettes;
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
      data: createData(),
      chartsThemeService,
      args,
      formatFactory: formatService.deserialize,
      paletteService: await paletteThemeService.getPalettes(),
      uiState,
    };
  });

  it('renders the chart', () => {
    const component = shallowWithIntl(<GaugeComponent {...wrapperProps} />);
    expect(component.find(Chart)).toMatchSnapshot();
  });

  it('returns null when metric is not provided', async () => {
    const customProps = {
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
    const customProps = {
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
    const customProps = {
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
    const customProps = {
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
    const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
    expect(goal.prop('actual')).toEqual(10);
  });

  describe('labelMajor and labelMinor settings', () => {
    it('displays no labelMajor and no labelMinor when no passed', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.NONE,
          labelMinor: '',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('');
      expect(goal.prop('labelMinor')).toEqual('');
    });
    it('displays custom labelMajor and labelMinor when passed', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.CUSTOM,
          labelMajor: 'custom labelMajor',
          labelMinor: 'custom labelMinor',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('custom labelMajor   ');
      expect(goal.prop('labelMinor')).toEqual('custom labelMinor  ');
    });
    it('displays auto labelMajor', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          labelMajorMode: GaugeLabelMajorModes.AUTO,
          labelMajor: '',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('labelMajor')).toEqual('Count of records   ');
    });
  });

  describe('ticks and color bands', () => {
    it('displays auto ticks', () => {
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
        },
      };
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 3.33, 6.67, 10]);
    });
    it('spreads auto ticks only over the [min, max] domain if color bands defined bigger domain', () => {
      const palette = {
        type: 'palette' as const,
        name: 'custom',
        params: {
          colors: ['#aaa', '#bbb', '#ccc'],
          gradient: false,
          stops: [10, 20, 30] as unknown as ColorStop[],
          range: 'number',
          rangeMin: 0,
          rangeMax: 30,
        },
      };
      const customProps = {
        ...wrapperProps,
        args: {
          ...wrapperProps.args,
          metric: 'metric-accessor',
          min: 'min-accessor',
          max: 'max-accessor',
          palette,
        },
      } as GaugeRenderProps;
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 3.33, 6.67, 10]);
    });
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 1, 2, 3, 4, 10]);
      expect(goal.prop('bands')).toEqual([0, 1, 2, 3, 4, 10]);
    });
    it('sets proper color bands and ticks on color bands if palette steps are smaller than minimum', () => {
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 4, 10]);
      expect(goal.prop('bands')).toEqual([0, 4, 10]);
    });
    it('sets proper color bands and ticks on color bands if percent palette steps are smaller than 0', () => {
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 8, 10]);
      expect(goal.prop('bands')).toEqual([0, 8, 10]);
    });
    it('doesnt set ticks for values differing <10%', () => {
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 1, 3, 10]);
      expect(goal.prop('bands')).toEqual([0, 1, 1.5, 3, 10]);
    });
    it('sets proper color bands and ticks on color bands for values greater than maximum', () => {
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 10]);
      expect(goal.prop('bands')).toEqual([0, 10]);
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 5, 10]);
      expect(goal.prop('bands')).toEqual([0, 5, 10]);
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
      const customProps = {
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
      const goal = shallowWithIntl(<GaugeComponent {...customProps} />).find(Goal);
      expect(goal.prop('ticks')).toEqual([0, 2, 6, 8, 10]);
      expect(goal.prop('bands')).toEqual([0, 2, 6, 8, 10]);
    });
  });
});
