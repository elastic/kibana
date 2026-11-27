/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, render, renderHook } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import {
  BubbleSeries,
  Position,
  ScaleType,
  type GeometryValue,
  type XYChartElementEvent,
  type XYChartSeriesIdentifier,
} from '@elastic/charts';
import type { CommonXYDataLayerConfig, XYOverlay, XYOverlayDatum } from '../../common';
import { XScaleTypes } from '../../common/constants';
import type { GroupsConfiguration } from '../helpers';
import {
  getClickedBaseSeriesEvent,
  getClickedOverlayPoint,
  getOverlaySeriesConfigs,
  getOverlaySpecId,
  OverlayPoints,
  useOverlays,
} from './overlay_points';

jest.mock('@elastic/charts', () => ({
  ...jest.requireActual('@elastic/charts'),
  BubbleSeries: jest.fn(() => null),
}));

const point = { trace_id: 'trace-1', '@timestamp': 1000, value: 42 };

const overlay: XYOverlay = {
  type: 'points',
  id: 'observability.exemplars',
  layerId: 'metrics',
  title: 'Exemplars',
  data: [point],
  xAccessor: '@timestamp',
  yAccessor: 'value',
  clickable: true,
};

const yAxesConfiguration: GroupsConfiguration = [
  { groupId: 'left', position: Position.Left, series: [{ layer: 'metrics', accessor: 'avg' }] },
];

const createLayer = (
  overrides: Partial<CommonXYDataLayerConfig> = {},
  formatId = 'number'
): CommonXYDataLayerConfig =>
  ({
    layerId: 'metrics',
    xAccessor: 'timestamp',
    table: {
      type: 'datatable',
      rows: [],
      columns: [{ id: 'avg', name: 'avg', meta: { type: 'number', params: { id: formatId } } }],
    },
    ...overrides,
  } as CommonXYDataLayerConfig);

const createHit = (specId: string, datum: XYOverlayDatum): XYChartElementEvent => {
  const geometry: GeometryValue = { x: 0, y: 0, accessor: 'y1', mark: null, datum };
  const series: XYChartSeriesIdentifier = {
    key: specId,
    specId,
    xAccessor: 'x',
    yAccessor: 'y1',
    splitAccessors: new Map(),
    seriesKeys: [],
  };
  return [geometry, series];
};

describe('overlay points', () => {
  it('follows the overlays pushed after the first render', () => {
    const overlays$ = new BehaviorSubject<readonly XYOverlay[]>([]);
    const { result } = renderHook(() => useOverlays(overlays$));
    expect(result.current).toEqual([]);

    act(() => overlays$.next([overlay]));

    expect(result.current).toEqual([overlay]);
  });

  it('binds each overlay to the axis and scales of its layer', () => {
    expect(
      getOverlaySeriesConfigs([overlay], yAxesConfiguration, [createLayer()], XScaleTypes.TIME)
    ).toEqual([
      {
        overlay,
        groupId: 'left',
        xScaleType: XScaleTypes.TIME,
        yScaleType: ScaleType.Linear,
      },
    ]);
  });

  it('draws points at their own X values on histogram layers', () => {
    const sameBucketPoints = [
      { '@timestamp': 1000, value: 1 },
      { '@timestamp': 1001, value: 2 },
    ];
    const histogramLayer = createLayer({
      isHistogram: true,
      table: {
        type: 'datatable',
        rows: [{ timestamp: 1000 }, { timestamp: 301000 }],
        columns: [
          { id: 'timestamp', name: 'timestamp', meta: { type: 'date' } },
          { id: 'avg', name: 'avg', meta: { type: 'number', params: { id: 'number' } } },
        ],
      },
    });

    render(
      <EuiThemeProvider>
        <OverlayPoints
          overlays={[{ ...overlay, data: sameBucketPoints }]}
          yAxesConfiguration={yAxesConfiguration}
          dataLayers={[histogramLayer]}
          defaultXScaleType={XScaleTypes.TIME}
        />
      </EuiThemeProvider>
    );

    expect(jest.mocked(BubbleSeries)).toHaveBeenCalledWith(
      expect.objectContaining({ data: sameBucketPoints, xAccessor: '@timestamp' }),
      expect.anything()
    );
  });

  it('follows the scale type of the Y axis', () => {
    const [{ yScaleType }] = getOverlaySeriesConfigs(
      [overlay],
      [{ ...yAxesConfiguration[0], scaleType: 'log' }],
      [createLayer()],
      XScaleTypes.TIME
    );
    expect(yScaleType).toBe(ScaleType.Log);
  });

  it('uses the binary scale on linear axes of bytes columns', () => {
    const [{ yScaleType }] = getOverlaySeriesConfigs(
      [overlay],
      yAxesConfiguration,
      [createLayer({}, 'bytes')],
      XScaleTypes.TIME
    );
    expect(yScaleType).toBe(ScaleType.LinearBinary);
  });

  it('skips overlays whose layer is not on any axis', () => {
    expect(
      getOverlaySeriesConfigs(
        [{ ...overlay, layerId: 'unknown' }],
        yAxesConfiguration,
        [createLayer()],
        XScaleTypes.TIME
      )
    ).toEqual([]);
  });

  it('skips overlays on a categorical X axis', () => {
    expect(
      getOverlaySeriesConfigs(
        [overlay],
        yAxesConfiguration,
        [createLayer({ xScaleType: XScaleTypes.ORDINAL })],
        XScaleTypes.TIME
      )
    ).toEqual([]);
  });

  it('hands back the clicked datum itself', () => {
    const clicked = getClickedOverlayPoint(
      [overlay],
      [createHit(getOverlaySpecId(overlay), point)]
    );

    expect(clicked).toEqual({
      overlayId: 'observability.exemplars',
      layerId: 'metrics',
      datum: point,
    });
    expect(clicked?.datum).toBe(point);
  });

  it('finds an overlay point hit after a regular series mark', () => {
    const clicked = getClickedOverlayPoint(
      [overlay],
      [createHit('some-data-series', {}), createHit(getOverlaySpecId(overlay), point)]
    );

    expect(clicked?.datum).toBe(point);
  });

  it('leaves the click to regular series when the overlay is not clickable', () => {
    const passive = { ...overlay, clickable: false };
    expect(
      getClickedOverlayPoint(
        [passive],
        [createHit('some-data-series', {}), createHit(getOverlaySpecId(passive), point)]
      )
    ).toBeUndefined();
  });

  it('hands the base series handler the first regular series hit, skipping overlay points', () => {
    const baseHit = createHit('some-data-series', {});
    expect(
      getClickedBaseSeriesEvent([overlay], [createHit(getOverlaySpecId(overlay), point), baseHit])
    ).toBe(baseHit);
    expect(
      getClickedBaseSeriesEvent([overlay], [createHit(getOverlaySpecId(overlay), point)])
    ).toBeUndefined();
  });

  it('ignores clicks on regular series', () => {
    expect(
      getClickedOverlayPoint([overlay], [createHit('some-data-series', point)])
    ).toBeUndefined();
  });

  it('gives a distinct series ID to every provider and layer pair', () => {
    expect(getOverlaySpecId({ ...overlay, id: 'a-b', layerId: 'c' })).not.toBe(
      getOverlaySpecId({ ...overlay, id: 'a', layerId: 'b-c' })
    );
  });
});
