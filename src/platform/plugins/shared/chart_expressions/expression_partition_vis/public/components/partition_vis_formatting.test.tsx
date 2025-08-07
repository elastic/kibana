/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PartitionVisComponent, { PartitionVisComponentProps } from './partition_vis_component';
import { ChartTypes, Dimensions } from '../../common/types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { createMockPieParams } from '../mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getFieldFormatsRegistryMock } from '@kbn/field-formats-plugin/public/mocks';
import { cleanChartMocks, setupChartMocks } from '@kbn/chart-expressions-common';
import React from 'react';
import { DebugState } from '@elastic/charts';
import { waitFor } from '@testing-library/dom';
import { render, act, RenderResult } from '@testing-library/react';
import { Datatable } from '@kbn/expressions-plugin/common';

async function expectChartsToRender(
  props: PartitionVisComponentProps
): Promise<{ component: RenderResult; debugState: DebugState }> {
  // enable the ech debug flag
  window._echDebugStateFlag = true;
  // render the chart
  const component = render(<PartitionVisComponent {...props} />);
  // wait for the first request animation frame to tick (used by ECh to detect the parent size from the mocked ResizeObserver)
  await act(async () => {
    jest.advanceTimersByTime(30);
  });
  // wait for render complete
  await waitFor(() => expect(props.renderComplete).toHaveBeenCalled());

  // extract the debug state json
  const debugStateJSON = component?.container
    ?.querySelector('.echChartStatus')
    ?.getAttribute('data-ech-debug-state');

  expect(debugStateJSON).toBeTruthy();

  return { component, debugState: JSON.parse(debugStateJSON as string) };
}
const dimensions: Dimensions = {
  metrics: ['value'],
  buckets: ['group'],
};

const dataTable: Datatable = {
  type: 'datatable',
  rows: [
    {
      group: 'Group A',
      value: 10,
    },
    {
      group: '',
      value: 20,
    },
    {
      group: null,
      value: 30,
    },
  ],
  columns: [
    {
      id: 'group',
      name: 'Group',
      meta: {
        type: 'string',
        field: 'group',
        index: 'test',
        params: {
          id: 'string',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        },
      },
    },
    {
      id: 'value',
      name: 'Value',
      meta: {
        type: 'number',
        index: 'test',
        params: {
          id: 'number',
        },
      },
    },
  ],
};

describe('Partition formatting', () => {
  let defaultProps: Omit<PartitionVisComponentProps, 'visData' | 'visParams'>;
  const chartsThemeService = chartPluginMock.createSetupContract().theme;
  const palettesRegistry = chartPluginMock.createPaletteRegistry();
  const mockState = new Map();
  const uiState = {
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
  } as any;

  beforeAll(() => {
    defaultProps = {
      chartsThemeService,
      palettesRegistry,
      visType: ChartTypes.PIE,
      uiState,
      syncColors: false,
      fireEvent: jest.fn(),
      hasCompatibleActions: jest.fn(),
      renderComplete: jest.fn(),
      interactive: true,
      columnCellValueActions: [],
      services: {
        data: dataPluginMock.createStartContract(),
        fieldFormats: getFieldFormatsRegistryMock(),
      },
      hasOpenedOnAggBasedEditor: false,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setupChartMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    cleanChartMocks();
    jest.useRealTimers();
  });

  test('correctly format nulls and empty values', async () => {
    const visParams = createMockPieParams();
    const { component } = await expectChartsToRender({
      ...defaultProps,
      visParams: {
        ...visParams,
        dimensions,
      },
      visData: dataTable,
    });

    const allRows = await component.findAllByRole('row');
    expect(allRows).toHaveLength(4);

    const labels = allRows.slice(1).map((row) => {
      const cell = row.querySelector('th');
      return cell ? cell.textContent : null;
    });

    expect(labels).toEqual(['(empty)', 'Group A', '(null)']);

    const values = allRows.slice(1).map((row) => {
      const cell = row.querySelector('td');
      return cell ? cell.textContent : null;
    });
    expect(values).toEqual(['20', '10', '30']);
  });
});
