/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { act, renderHook } from '@testing-library/react';
import { Position, ScaleType } from '@elastic/charts';
import type { CommonXYDataLayerConfig, XYOverlay } from '../../common';
import { XScaleTypes } from '../../common/constants';
import type { GroupsConfiguration } from '../helpers';
import { getClickedOverlayPoint, getOverlaySeriesConfigs, useOverlays } from './overlay_points';

const point = { trace_id: 'trace-1', '@timestamp': 1000, value: 42 };

const overlay: XYOverlay = {
  type: 'points',
  id: 'observability.exemplars',
  layerId: 'metrics',
  title: 'Exemplars',
  data: [point],
  xAccessor: '@timestamp',
  yAccessor: 'value',
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
      { overlay, groupId: 'left', xScaleType: XScaleTypes.TIME, yScaleType: ScaleType.Linear },
    ]);
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
      'xy-overlay-observability.exemplars-metrics',
      point
    );

    expect(clicked).toEqual({
      overlayId: 'observability.exemplars',
      layerId: 'metrics',
      datum: point,
    });
    expect(clicked?.datum).toBe(point);
  });

  it('ignores clicks on regular series', () => {
    expect(getClickedOverlayPoint([overlay], 'some-data-series', point)).toBeUndefined();
  });
});
