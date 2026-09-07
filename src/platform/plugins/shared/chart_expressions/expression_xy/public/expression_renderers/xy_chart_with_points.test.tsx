/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { of } from 'rxjs';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { LayerTypes } from '../../common/constants';
import type { XYChartRenderProps } from '../components/xy_chart';
import { XYChartWithPoints } from './xy_chart_with_points';

// Minimal ES|QL raw response for a single metric row.
function makeRawResponse(yAccessor: string, yValue: number) {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: yAccessor, type: 'double' },
    ],
    values: [['2024-01-01T00:00:00.000Z', yValue]],
  };
}

function makePointsLayer(layerId: string, yAccessor = 'system.cpu.total.norm.pct') {
  return {
    layerId,
    layerType: LayerTypes.POINTS,
    type: 'pointsLayer' as const,
    query: 'FROM metrics.exemplars-* | SORT @timestamp ASC | LIMIT 100',
    yAccessor,
  };
}

function makeProps(
  overrides: {
    layers?: unknown[];
    searchMock?: jest.Mock;
    XYChartReportable?: React.ComponentType<XYChartRenderProps>;
  } = {}
) {
  const dataMock = dataPluginMock.createStartContract();
  // search.search is already a jest.fn() in the mock — override directly when needed.
  if (overrides.searchMock) {
    dataMock.search.search = overrides.searchMock;
  }

  const XYChartReportable =
    overrides.XYChartReportable ??
    (jest.fn(() => null) as unknown as React.ComponentType<XYChartRenderProps>);

  return {
    data: dataMock,
    args: { layers: overrides.layers ?? [] } as unknown as XYChartRenderProps['args'],
    XYChartReportable,
  } as unknown as XYChartRenderProps & {
    XYChartReportable: React.ComponentType<XYChartRenderProps>;
  };
}

describe('XYChartWithPoints', () => {
  it('renders XYChartReportable directly when there are no points layers', () => {
    const XYChartReportable = jest.fn(
      () => null
    ) as unknown as React.ComponentType<XYChartRenderProps>;
    const props = makeProps({ layers: [], XYChartReportable });

    act(() => {
      render(<XYChartWithPoints {...props} />);
    });

    expect(XYChartReportable).toHaveBeenCalled();
    expect(props.data.search.search).not.toHaveBeenCalled();
  });

  it('fetches data for a points layer and passes it as pointsData keyed by layerId', () => {
    const ACCESSOR = 'system.cpu.total.norm.pct';
    const searchMock = jest
      .fn()
      .mockReturnValue(of({ rawResponse: makeRawResponse(ACCESSOR, 0.42) }));
    const XYChartReportable = jest.fn(
      () => null
    ) as unknown as React.ComponentType<XYChartRenderProps>;
    const props = makeProps({
      layers: [makePointsLayer('layer-1', ACCESSOR)],
      searchMock,
      XYChartReportable,
    });

    act(() => {
      render(<XYChartWithPoints {...props} />);
    });

    const lastProps = (XYChartReportable as jest.Mock).mock.calls.at(-1)[0];
    expect(lastProps.pointsData).toEqual({
      'layer-1': [
        {
          x: new Date('2024-01-01T00:00:00.000Z').getTime(),
          y: 0.42,
          details: [],
        },
      ],
    });
  });

  it('fetches all points layers in parallel and merges results by layerId', () => {
    const searchMock = jest
      .fn()
      .mockReturnValueOnce(of({ rawResponse: makeRawResponse('cpu', 0.5) }))
      .mockReturnValueOnce(of({ rawResponse: makeRawResponse('mem', 0.8) }));
    const XYChartReportable = jest.fn(
      () => null
    ) as unknown as React.ComponentType<XYChartRenderProps>;
    const props = makeProps({
      layers: [makePointsLayer('layer-cpu', 'cpu'), makePointsLayer('layer-mem', 'mem')],
      searchMock,
      XYChartReportable,
    });

    act(() => {
      render(<XYChartWithPoints {...props} />);
    });

    expect(searchMock).toHaveBeenCalledTimes(2);
    const lastProps = (XYChartReportable as jest.Mock).mock.calls.at(-1)[0];
    expect(lastProps.pointsData['layer-cpu'][0].y).toBe(0.5);
    expect(lastProps.pointsData['layer-mem'][0].y).toBe(0.8);
  });

  it('unsubscribes from all subscriptions on unmount', () => {
    const unsubscribeSpy = jest.fn();
    const searchMock = jest.fn().mockImplementation(() => ({
      subscribe: () => ({ unsubscribe: unsubscribeSpy }),
    }));

    const props = makeProps({
      layers: [makePointsLayer('layer-1'), makePointsLayer('layer-2')],
      searchMock,
    });

    let unmount: () => void;
    act(() => {
      ({ unmount } = render(<XYChartWithPoints {...props} />));
    });

    act(() => {
      unmount!();
    });

    expect(unsubscribeSpy).toHaveBeenCalledTimes(2);
  });
});
