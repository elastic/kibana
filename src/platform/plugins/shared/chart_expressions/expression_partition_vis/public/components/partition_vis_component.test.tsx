/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Settings, TooltipType, SeriesIdentifier, Tooltip, TooltipAction } from '@elastic/charts';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act } from 'react-dom/test-utils';
import PartitionVisComponent, { PartitionVisComponentProps } from './partition_vis_component';
import {
  createMockDonutParams,
  createMockPieParams,
  createMockTreemapMosaicParams,
  createMockVisData,
  createMockWaffleParams,
} from '../mocks';
import { ChartTypes } from '../../common/types';
import { LegendSize } from '@kbn/visualizations-plugin/common';
import { cloneDeep } from 'lodash';

const actWithTimeout = (action: Function, timer: number = 1) =>
  act(
    () =>
      new Promise((resolve) =>
        setTimeout(async () => {
          await action();
          resolve(void 0);
        }, timer)
      )
  );

const chartsThemeService = chartPluginMock.createSetupContract().theme;
const palettesRegistry = chartPluginMock.createPaletteRegistry();
const visParams = createMockPieParams();
const visData = createMockVisData();

const mockState = new Map();
const uiState = {
  get: jest
    .fn()
    .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
  set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
  emit: jest.fn(),
  setSilent: jest.fn(),
} as any;

describe('PartitionVisComponent', function () {
  let wrapperProps: PartitionVisComponentProps;

  beforeAll(() => {
    wrapperProps = {
      chartsThemeService,
      palettesRegistry,
      visParams,
      visData,
      visType: ChartTypes.PIE,
      uiState,
      syncColors: false,
      fireEvent: jest.fn(),
      renderComplete: jest.fn(),
      interactive: true,
      columnCellValueActions: [],
      services: {
        data: dataPluginMock.createStartContract(),
        fieldFormats: fieldFormatsServiceMock.createStartContract(),
      },
      hasOpenedOnAggBasedEditor: false,
    };
  });

  afterEach(() => {
    mockState.clear();
    jest.clearAllMocks();
  });

  it('should render correct structure for pie', function () {
    const component = shallow(<PartitionVisComponent {...wrapperProps} />);
    expect(component).toMatchSnapshot();
  });

  it('should render correct structure for multi-metric pie', function () {
    const localParams = cloneDeep(wrapperProps.visParams);

    localParams.dimensions.metrics = [...localParams.dimensions.metrics, 'col-3-1'];

    localParams.metricsToLabels = { 'col-3-1': 'metric1 label', 'col-1-1': 'metric2 label' };

    const component = shallow(<PartitionVisComponent {...wrapperProps} visParams={localParams} />);
    expect(component).toMatchSnapshot();
  });

  it('should render correct structure for donut', function () {
    const donutVisParams = createMockDonutParams();
    const component = shallow(
      <PartitionVisComponent
        {...{
          ...wrapperProps,
          visType: ChartTypes.DONUT,
          visParams: donutVisParams,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render correct structure for treemap', function () {
    const treemapVisParams = createMockTreemapMosaicParams();
    const component = shallow(
      <PartitionVisComponent
        {...{
          ...wrapperProps,
          visType: ChartTypes.TREEMAP,
          visParams: treemapVisParams,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render correct structure for mosaic', function () {
    const mosaicVisParams = createMockTreemapMosaicParams();
    const component = shallow(
      <PartitionVisComponent
        {...{
          ...wrapperProps,
          visType: ChartTypes.MOSAIC,
          visParams: mosaicVisParams,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render correct structure for waffle', function () {
    const waffleVisParams = createMockWaffleParams();
    const component = shallow(
      <PartitionVisComponent
        {...{
          ...wrapperProps,
          visType: ChartTypes.WAFFLE,
          visParams: waffleVisParams,
        }}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders the legend toggle component', async () => {
    const component = mountWithIntl(<PartitionVisComponent {...wrapperProps} />);
    await actWithTimeout(async () => {
      await component.update();
    });

    await act(async () => {
      expect(findTestSubject(component, 'vislibToggleLegend').length).toBe(1);
    });
  });

  it('should render legend actions when it is interactive', async () => {
    const component = shallow(<PartitionVisComponent {...wrapperProps} interactive={true} />);
    expect(component.find(Settings).prop('legendAction')).toBeDefined();
  });

  it('should not render legend actions when it is not interactive', async () => {
    const component = shallow(<PartitionVisComponent {...wrapperProps} interactive={false} />);
    expect(component.find(Settings).prop('legendAction')).toBeUndefined();
  });

  it('hides the legend if the legend toggle is clicked', async () => {
    const component = mountWithIntl(<PartitionVisComponent {...wrapperProps} />);
    await actWithTimeout(async () => {
      await component.update();
    });
    findTestSubject(component, 'vislibToggleLegend').simulate('click');
    await act(async () => {
      expect(component.find(Settings).prop('showLegend')).toEqual(false);
    });
  });

  it('defaults on showing the legend for the inner cicle', () => {
    const component = shallow(<PartitionVisComponent {...wrapperProps} />);
    expect(component.find(Settings).prop('legendMaxDepth')).toBe(1);
  });

  it('shows the nested legend when the user requests it', () => {
    const newParams = { ...visParams, nestedLegend: true };
    const newProps = { ...wrapperProps, visParams: newParams };
    const component = shallow(<PartitionVisComponent {...newProps} />);
    expect(component.find(Settings).prop('legendMaxDepth')).toBeUndefined();
  });

  it('sets correct legend sizes', () => {
    const component = shallow(
      <PartitionVisComponent
        {...wrapperProps}
        visParams={{
          ...visParams,
          legendSize: LegendSize.SMALL,
        }}
      />
    );
    expect(component.find(Settings).prop('legendSize')).toEqual(80);

    component.setProps({
      visParams: {
        ...visParams,
        legendSize: LegendSize.AUTO,
      },
    });
    expect(component.find(Settings).prop('legendSize')).toBeUndefined();

    component.setProps({
      visParams: {
        ...visParams,
        legendSize: undefined,
      },
    });
    expect(component.find(Settings).prop('legendSize')).toEqual(130);
  });

  it('defaults on displaying the tooltip', () => {
    const component = shallow(<PartitionVisComponent {...wrapperProps} />);
    expect(component.find(Tooltip).prop('type')).toBe(TooltipType.Follow);
  });

  it('doesnt show the tooltip when the user requests it', () => {
    const newParams = { ...visParams, addTooltip: false };
    const newProps = { ...wrapperProps, visParams: newParams };
    const component = shallow(<PartitionVisComponent {...newProps} />);
    expect(component.find(Tooltip).prop('type')).toBe(TooltipType.None);
  });

  it('calls filter callback', () => {
    const component = shallow(<PartitionVisComponent {...wrapperProps} />);
    component.find(Settings).first().prop('onElementClick')!([
      [
        [
          {
            groupByRollup: 6,
            value: 6,
            depth: 1,
            path: [],
            sortIndex: 1,
            smAccessorValue: 'Logstash Airways',
          },
        ],
        {} as SeriesIdentifier,
      ],
    ]);
    expect(wrapperProps.fireEvent).toHaveBeenCalled();
  });

  it('renders the no results component if all the values are zero', () => {
    const newVisData = {
      type: 'datatable',
      columns: [
        {
          id: 'col-0-2',
          name: 'filters',
        },
        {
          id: 'col-1-1',
          name: 'Count',
        },
      ],
      rows: [
        {
          'col-0-2': 'Carrier : "JetBeats" ',
          'col-1-1': 0,
        },
        {
          'col-0-2': 'Carrier : "ES-Air" ',
          'col-1-1': 0,
        },
      ],
    } as unknown as Datatable;
    const newProps = { ...wrapperProps, visData: newVisData };
    const component = mountWithIntl(<PartitionVisComponent {...newProps} />);
    expect(findTestSubject(component, 'partitionVisEmptyValues').text()).toEqual(
      'No results found'
    );
  });

  it('renders the no results component if there are negative values', () => {
    const newVisData = {
      type: 'datatable',
      columns: [
        {
          id: 'col-0-2',
          name: 'filters',
        },
        {
          id: 'col-1-1',
          name: 'Count',
        },
      ],
      rows: [
        {
          'col-0-2': 'Carrier : "JetBeats" ',
          'col-1-1': -10,
        },
        {
          'col-0-2': 'Carrier : "ES-Air" ',
          'col-1-1': -10,
        },
      ],
    } as unknown as Datatable;
    const newProps = { ...wrapperProps, visData: newVisData };
    const component = mountWithIntl(<PartitionVisComponent {...newProps} />);
    expect(findTestSubject(component, 'partitionVisNegativeValues').text()).toEqual(
      "Pie chart can't render with negative values."
    );
  });

  describe('overrides', () => {
    it('should apply overrides to the settings component', () => {
      const component = shallow(
        <PartitionVisComponent
          {...wrapperProps}
          overrides={{ settings: { onBrushEnd: 'ignore', ariaUseDefaultSummary: true } }}
        />
      );

      const settingsComponent = component.find(Settings);
      expect(settingsComponent.prop('onBrushEnd')).toBeUndefined();
      expect(settingsComponent.prop('ariaUseDefaultSummary')).toEqual(true);
    });
  });

  describe('tooltip', () => {
    it('should not have actions if chart is not interactive', () => {
      const component = shallow(<PartitionVisComponent {...wrapperProps} interactive={false} />);
      const tooltip = component.find(Tooltip);
      const actions = tooltip.prop('actions');
      expect(actions).toBeUndefined();
    });
    it('should not have actions if chart has only metrics', () => {
      const noBucketParams = {
        ...wrapperProps,
        visParams: {
          ...wrapperProps.visParams,
          dimensions: { ...wrapperProps.visParams.dimensions, buckets: [] },
        },
      };

      const component = shallow(<PartitionVisComponent {...noBucketParams} />);
      const tooltip = component.find(Tooltip);
      const actions = tooltip.prop('actions');
      expect(actions).toBeUndefined();
    });
    it('should have tooltip actions when the chart is fully configured and interactive', () => {
      const component = shallow(<PartitionVisComponent {...wrapperProps} />);
      const tooltip = component.find(Tooltip);
      const actions = tooltip.prop('actions');
      expect(actions?.length).toBe(1);
      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            onSelect: expect.any(Function),
            disabled: expect.any(Function),
          }),
        ])
      );
    });
    it('selecting correct actions calls a callback with correct filter data', () => {
      const component = shallow(<PartitionVisComponent {...wrapperProps} />);
      const tooltip = component.find(Tooltip);
      const actions = tooltip.prop('actions') as TooltipAction[];
      actions[0].onSelect!(
        [
          {
            label: 'JetBeats',
            color: '#79aad9',
            isHighlighted: false,
            isVisible: true,
            seriesIdentifier: {
              specId: 'donut',
              key: 'JetBeats',
            },
            value: 655,
            formattedValue: '655',
            valueAccessor: 1,
          },
        ],
        []
      );
      expect(wrapperProps.fireEvent).toHaveBeenCalledWith({
        name: 'multiFilter',
        data: { data: [{ cells: [{ column: 0, row: 2 }], table: wrapperProps.visData }] },
      });
    });
  });
});
