/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import { BubbleSeries, PointShape, ScaleType } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import type { XYOverlay, XYOverlayPoint } from '../../common';
import type { GroupsConfiguration } from '../helpers';
import type { OverlayPointClickEvent } from '../types';

const OVERLAY_SPEC_ID_PREFIX = 'xy-overlay';

const getOverlaySpecId = ({ id, layerId }: XYOverlay) =>
  `${OVERLAY_SPEC_ID_PREFIX}-${id}-${layerId}`;

const NO_OVERLAYS: readonly XYOverlay[] = [];

/** Subscribes to the overlays pushed to the chart after its first render. */
export const useOverlays = (overlays$?: Observable<readonly XYOverlay[]>): readonly XYOverlay[] => {
  const [overlays, setOverlays] = useState<readonly XYOverlay[]>(NO_OVERLAYS);

  useEffect(() => {
    if (!overlays$) {
      setOverlays(NO_OVERLAYS);
      return;
    }
    const subscription = overlays$.subscribe(setOverlays);
    return () => subscription.unsubscribe();
  }, [overlays$]);

  return overlays;
};

/** Maps a chart element click to the overlay point it hit, if any. */
export const getClickedOverlayPoint = (
  overlays: readonly XYOverlay[],
  specId: string,
  datum: unknown
): OverlayPointClickEvent['data'] | undefined => {
  const overlay = overlays.find((candidate) => getOverlaySpecId(candidate) === specId);
  if (!overlay) {
    return undefined;
  }
  const point = overlay.points.find((candidate) => candidate === datum);
  return point ? { overlayId: overlay.id, layerId: overlay.layerId, pointId: point.id } : undefined;
};

/** Pairs each overlay with the Y axis group of its layer, dropping overlays whose layer is not drawn. */
export const getOverlaysWithAxisGroup = (
  overlays: readonly XYOverlay[],
  yAxesConfiguration: GroupsConfiguration
): Array<{ overlay: XYOverlay; groupId: string }> =>
  overlays.flatMap((overlay) => {
    const axis = yAxesConfiguration.find(({ series }) =>
      series.some(({ layer }) => layer === overlay.layerId)
    );
    return axis ? [{ overlay, groupId: axis.groupId }] : [];
  });

interface OverlayPointsProps {
  overlays: readonly XYOverlay[];
  yAxesConfiguration: GroupsConfiguration;
  isTimeVis: boolean;
}

export const OverlayPoints = ({ overlays, yAxesConfiguration, isTimeVis }: OverlayPointsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      {getOverlaysWithAxisGroup(overlays, yAxesConfiguration).map(({ overlay, groupId }) => {
        return (
          <BubbleSeries<XYOverlayPoint>
            key={getOverlaySpecId(overlay)}
            id={getOverlaySpecId(overlay)}
            name={overlay.title}
            groupId={groupId}
            xScaleType={isTimeVis ? ScaleType.Time : ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={[...overlay.points]}
            hideInLegend
            color={euiTheme.colors.vis.euiColorVis6}
            bubbleSeriesStyle={{
              point: {
                shape: PointShape.Diamond,
                radius: 6,
                strokeWidth: 1,
                stroke: euiTheme.colors.emptyShade,
                opacity: 1,
              },
            }}
          />
        );
      })}
    </>
  );
};
