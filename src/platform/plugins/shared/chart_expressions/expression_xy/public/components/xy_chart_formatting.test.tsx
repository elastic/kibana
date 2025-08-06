/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { createArgsWithLayers } from '../../common/__mocks__';
import { XYChart, XYChartRenderProps } from './xy_chart';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { chartsActiveCursorService, chartsThemeService, paletteService } from '../__mocks__';
import { eventAnnotationServiceMock as eventAnnotationService } from '@kbn/event-annotation-plugin/public/mocks';
import { LayerCellValueActions } from '../types';
import { setupChartMocks, cleanChartMocks } from '@kbn/chart-expressions-common';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { DebugState } from '@elastic/charts';
import { XYProps } from '../../common/types';

const table: Datatable = {
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

async function expectChartsToRender(
  defaultProps: Omit<XYChartRenderProps, 'args'>,
  args: XYProps
): Promise<DebugState> {
  // enable the ech debug flag
  window._echDebugStateFlag = true;
  // render the chart
  const component = render(<XYChart {...defaultProps} args={args} />);
  // wait for the first request animation frame to tick (used by ECh to detect the parent size from the mocked ResizeObserver)
  await act(async () => {
    jest.advanceTimersByTime(30);
  });
  // wait for render complete
  await waitFor(() => expect(defaultProps.renderComplete).toHaveBeenCalled());

  // extract the debug state json
  const debugStateJSON = component?.container
    ?.querySelector('.echChartStatus')
    ?.getAttribute('data-ech-debug-state');

  expect(debugStateJSON).toBeTruthy();

  return JSON.parse(debugStateJSON as string);
}

describe('XY chart formatting', () => {
  let getFormatSpy: jest.Mock;
  let convertSpy: jest.Mock;
  let defaultProps: Omit<XYChartRenderProps, 'args'>;

  beforeEach(() => {
    convertSpy = jest.fn((x) => x);
    getFormatSpy = jest.fn();
    getFormatSpy.mockReturnValue({ convert: convertSpy });
    jest.clearAllMocks();
    const onClickValue = jest.fn();
    const onClickMultiValue = jest.fn();
    const layerCellValueActions: LayerCellValueActions = [];
    const onSelectRange = jest.fn();

    defaultProps = {
      data: dataPluginMock.createStartContract(),
      formatFactory: getFormatSpy,
      timeZone: 'UTC',
      renderMode: 'view',
      chartsThemeService,
      chartsActiveCursorService,
      paletteService,
      minInterval: 50,
      onClickValue,
      onClickMultiValue,
      layerCellValueActions,
      onSelectRange,
      syncColors: false,
      syncTooltips: false,
      syncCursor: true,
      eventAnnotationService,
      renderComplete: jest.fn(),
      timeFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
      setChartSize: jest.fn(),
      onCreateAlertRule: jest.fn(),
    };
    setupChartMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    cleanChartMocks();
    jest.useRealTimers();
  });

  test('split series without formatting with multiple y accessors', async () => {
    const defaultArgs = createArgsWithLayers();
    const args = {
      ...defaultArgs,
      layers: [
        {
          ...defaultArgs.layers[0],
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table,
        },
      ],
    };

    const debugState = await expectChartsToRender(defaultProps, args);
    // the formatting is applied to the split accessor (Row 1, Row 2) and remain the same for the rest
    expect(debugState.legend?.items[0].name).toEqual('Row 1 - Label A');
    expect(debugState.legend?.items[1].name).toEqual('Row 2 - Label A');
    expect(debugState.legend?.items[2].name).toEqual('Row 1 - Label B');
    expect(debugState.legend?.items[3].name).toEqual('Row 2 - Label B');
  });

  test('split series with formatting and single y accessor', async () => {
    const defaultArgs = createArgsWithLayers();
    const tableWithCustomFormatter: Datatable = {
      ...table,
      columns: [
        { id: 'a', name: 'a', meta: { type: 'number' } },
        { id: 'b', name: 'b', meta: { type: 'number' } },
        { id: 'c', name: 'c', meta: { type: 'string' } },
        { id: 'd', name: 'd', meta: { type: 'string', params: { id: 'custom' } } },
      ],
    };
    const args = {
      ...defaultArgs,
      layers: [
        {
          ...defaultArgs.layers[0],
          xAccessor: 'c',
          accessors: ['a'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A"}',
          table: tableWithCustomFormatter,
        },
      ],
    };
    convertSpy.mockReturnValueOnce('formatted');

    const debugState = await expectChartsToRender(defaultProps, args);

    // formatted only the first X value due to the `mockReturnValueOnce` returning only for the first time called
    expect(debugState.axes?.x[0].values).toEqual(['formatted', 'J']);

    // const nameFn = component.find(DataLayers).dive().find(LineSeries).prop('name') as SeriesNameFn;
    expect(getFormatSpy).toHaveBeenCalledWith({ id: 'custom' });
  });

  test('split series with formatting with multiple y accessors', async () => {
    const defaultArgs = createArgsWithLayers();
    const args = {
      ...defaultArgs,
      layers: [
        {
          ...defaultArgs.layers[0],
          accessors: ['a', 'b'],
          splitAccessors: ['d'],
          columnToLabel: '{"a": "Label A","b": "Label B"}',
          table,
        },
      ],
    };

    // general formatter that is attached to the split accessor `d`
    convertSpy.mockImplementation((d: unknown) => {
      return d === 'Row 1' ? 'formatted1' : d === 'Row 2' ? 'formatted2' : d;
    });

    const debugState = await expectChartsToRender(defaultProps, args);

    // the formatting is applied to the split accessor (Row 1, Row 2) and remain the same for the rest
    expect(debugState.legend?.items[0].name).toEqual('formatted1 - Label A');
    expect(debugState.legend?.items[1].name).toEqual('formatted2 - Label A');
    expect(debugState.legend?.items[2].name).toEqual('formatted1 - Label B');
    expect(debugState.legend?.items[3].name).toEqual('formatted2 - Label B');
  });
});
