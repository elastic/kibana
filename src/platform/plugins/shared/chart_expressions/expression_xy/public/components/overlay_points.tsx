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
import { BubbleSeries, PointShape, type ScaleContinuousType } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { getAccessorByDimension } from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig, XScaleType, XYOverlay, XYOverlayDatum } from '../../common';
import { XScaleTypes } from '../../common/constants';
import { getSeriesXScaleType, getSeriesYScaleType, type GroupsConfiguration } from '../helpers';
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

/** Maps a chart element click to the overlay it hit, if any. The chart hands back the original datum object. */
export const getClickedOverlayPoint = (
  overlays: readonly XYOverlay[],
  specId: string,
  datum: XYOverlayDatum
): OverlayPointClickEvent['data'] | undefined => {
  const overlay = overlays.find((candidate) => getOverlaySpecId(candidate) === specId);
  return overlay ? { overlayId: overlay.id, layerId: overlay.layerId, datum } : undefined;
};

export interface OverlaySeriesConfig {
  overlay: XYOverlay;
  groupId: string;
  xScaleType: XScaleType;
  yScaleType: ScaleContinuousType;
}

/**
 * Pairs each overlay with the Y axis group and the scales of its layer, mirroring the layer's own series.
 * Overlays are dropped when their layer is not drawn or has a categorical X axis, where numeric `x` values cannot be placed.
 */
export const getOverlaySeriesConfigs = (
  overlays: readonly XYOverlay[],
  yAxesConfiguration: GroupsConfiguration,
  dataLayers: readonly CommonXYDataLayerConfig[],
  defaultXScaleType: XScaleType
): OverlaySeriesConfig[] =>
  overlays.flatMap((overlay) => {
    const layer = dataLayers.find(({ layerId }) => layerId === overlay.layerId);
    const axis = yAxesConfiguration.find(({ series }) =>
      series.some(({ layer: layerId }) => layerId === overlay.layerId)
    );
    const series = axis?.series.find(({ layer: layerId }) => layerId === overlay.layerId);
    if (!layer || !axis || !series) {
      return [];
    }
    const { table, xAccessor } = layer;
    const xColumnId = xAccessor ? getAccessorByDimension(xAccessor, table.columns) : undefined;
    const xScaleType = getSeriesXScaleType(layer, xColumnId, defaultXScaleType);
    if (xScaleType === XScaleTypes.ORDINAL) {
      return [];
    }
    const columnFormatId = table.columns.find(({ id }) => id === series.accessor)?.meta.params?.id;
    const yScaleType = getSeriesYScaleType(axis, columnFormatId);
    return [{ overlay, groupId: axis.groupId, xScaleType, yScaleType }];
  });

interface OverlayPointsProps {
  overlays: readonly XYOverlay[];
  yAxesConfiguration: GroupsConfiguration;
  dataLayers: readonly CommonXYDataLayerConfig[];
  defaultXScaleType: XScaleType;
}

export const OverlayPoints = ({
  overlays,
  yAxesConfiguration,
  dataLayers,
  defaultXScaleType,
}: OverlayPointsProps) => {
  const { euiTheme } = useEuiTheme();
  const color = euiTheme.colors.vis.euiColorVis6;

  return (
    <>
      {getOverlaySeriesConfigs(overlays, yAxesConfiguration, dataLayers, defaultXScaleType).map(
        ({ overlay, groupId, xScaleType, yScaleType }) => {
          return (
            <BubbleSeries<XYOverlayDatum>
              key={getOverlaySpecId(overlay)}
              id={getOverlaySpecId(overlay)}
              name={overlay.title}
              groupId={groupId}
              xScaleType={xScaleType}
              yScaleType={yScaleType}
              xAccessor={overlay.xAccessor}
              yAccessors={[overlay.yAccessor]}
              data={overlay.data}
              hideInLegend
              color={color}
              bubbleSeriesStyle={{
                point: {
                  shape: PointShape.Diamond,
                  radius: 6,
                  strokeWidth: 1,
                  fill: color,
                  stroke: euiTheme.colors.emptyShade,
                  opacity: 1,
                },
              }}
            />
          );
        }
      )}
    </>
  );
};
