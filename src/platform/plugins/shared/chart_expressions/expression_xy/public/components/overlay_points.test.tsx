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
import { Position } from '@elastic/charts';
import type { XYOverlay } from '../../common';
import type { GroupsConfiguration } from '../helpers';
import { getClickedOverlayPoint, getOverlaysWithAxisGroup, useOverlays } from './overlay_points';

const point = { id: 'trace-1', x: 1000, y: 42 };

const overlay: XYOverlay = {
  type: 'points',
  id: 'observability.exemplars',
  layerId: 'metrics',
  title: 'Exemplars',
  points: [point],
};

const yAxesConfiguration: GroupsConfiguration = [
  { groupId: 'left', position: Position.Left, series: [{ layer: 'metrics', accessor: 'avg' }] },
];

describe('overlay points', () => {
  it('follows the overlays pushed after the first render', () => {
    const overlays$ = new BehaviorSubject<readonly XYOverlay[]>([]);
    const { result } = renderHook(() => useOverlays(overlays$));
    expect(result.current).toEqual([]);

    act(() => overlays$.next([overlay]));

    expect(result.current).toEqual([overlay]);
  });

  it('binds each overlay to the axis of its layer', () => {
    expect(getOverlaysWithAxisGroup([overlay], yAxesConfiguration)).toEqual([
      { overlay, groupId: 'left' },
    ]);
  });

  it('skips overlays whose layer is not on any axis', () => {
    expect(
      getOverlaysWithAxisGroup([{ ...overlay, layerId: 'unknown' }], yAxesConfiguration)
    ).toEqual([]);
  });

  it('maps a click on an overlay point to its ids', () => {
    expect(
      getClickedOverlayPoint([overlay], 'xy-overlay-observability.exemplars-metrics', point)
    ).toEqual({ overlayId: 'observability.exemplars', layerId: 'metrics', pointId: 'trace-1' });
  });

  it('ignores clicks on regular series', () => {
    expect(getClickedOverlayPoint([overlay], 'some-data-series', point)).toBeUndefined();
  });
});
