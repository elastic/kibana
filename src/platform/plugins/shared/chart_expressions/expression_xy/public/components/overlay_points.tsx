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
import {
  BubbleSeries,
  PointShape,
  type ScaleContinuousType,
  type XYChartElementEvent,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { getAccessorByDimension } from '@kbn/chart-expressions-common';
import type {
  CommonXYDataLayerConfig,
  XScaleType,
  XYOverlay,
  XYOverlayAccessor,
  XYOverlayDatum,
} from '../../common';
import { XScaleTypes } from '../../common/constants';
import { getSeriesXScaleType, getSeriesYScaleType, type GroupsConfiguration } from '../helpers';
import type { OverlayPointClickEvent } from '../types';
import { getXValues } from './x_domain';

const OVERLAY_SPEC_ID_PREFIX = 'xy-overlay';

export const getOverlaySpecId = ({ id, layerId }: XYOverlay): string =>
  `${OVERLAY_SPEC_ID_PREFIX}-${JSON.stringify([id, layerId])}`;

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

/**
 * Returns the first clickable overlay point among the elements hit by a click, even when a base series mark was hit first.
 * The chart hands back the original datum object.
 */
export const getClickedOverlayPoint = (
  overlays: readonly XYOverlay[],
  elementEvents: readonly XYChartElementEvent[]
): OverlayPointClickEvent['data'] | undefined => {
  for (const [{ datum }, { specId }] of elementEvents) {
    const overlay = overlays.find(
      (candidate) => candidate.clickable && getOverlaySpecId(candidate) === specId
    );
    if (overlay) {
      return { overlayId: overlay.id, layerId: overlay.layerId, datum };
    }
  }
  return undefined;
};

/** Returns the first element hit by a click that belongs to a base series, skipping overlay points. */
export const getClickedBaseSeriesEvent = (
  overlays: readonly XYOverlay[],
  elementEvents: readonly XYChartElementEvent[]
): XYChartElementEvent | undefined =>
  elementEvents.find(
    ([, { specId }]) => !overlays.some((overlay) => getOverlaySpecId(overlay) === specId)
  );

/** Returns where a bucket of the layer ends, or `undefined` when the layer has no known interval. */
export type GetLayerBucketEnd = (
  layer: CommonXYDataLayerConfig
) => ((bucketStart: number) => number) | undefined;

export interface OverlaySeriesConfig {
  overlay: XYOverlay;
  groupId: string;
  xScaleType: XScaleType;
  yScaleType: ScaleContinuousType;
  data: XYOverlayDatum[];
  xAccessor: XYOverlayAccessor;
}

const getOverlayX = ({ xAccessor }: XYOverlay, datum: XYOverlayDatum): number =>
  typeof xAccessor === 'function' ? xAccessor(datum) : Number(datum[xAccessor]);

const getSmallestGap = (sortedValues: readonly number[]): number | undefined => {
  let smallestGap: number | undefined;
  for (let index = 1; index < sortedValues.length; index++) {
    const gap = sortedValues[index] - sortedValues[index - 1];
    smallestGap = smallestGap === undefined ? gap : Math.min(smallestGap, gap);
  }
  return smallestGap;
};

/**
 * Returns the start of the drawn bucket containing `x`, or `undefined` when no drawn bucket contains it,
 * so points in empty or dropped buckets are not moved onto another bar.
 */
const findBucketStart = (
  bucketStarts: readonly number[],
  getEnd: (bucketStart: number) => number,
  x: number
): number | undefined => {
  let bucketIndex: number | undefined;
  let low = 0;
  let high = bucketStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (bucketStarts[middle] <= x) {
      bucketIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (bucketIndex === undefined) {
    return undefined;
  }
  const bucketStart = bucketStarts[bucketIndex];
  return x < getEnd(bucketStart) ? bucketStart : undefined;
};

/**
 * Moves each point to the start of its layer bucket. The chart derives the bar width from the smallest gap
 * between X values, so points between buckets would shrink every bar of the base chart.
 */
const snapToBuckets = (
  overlay: XYOverlay,
  layer: CommonXYDataLayerConfig,
  getLayerBucketEnd: GetLayerBucketEnd
): Pick<OverlaySeriesConfig, 'data' | 'xAccessor'> => {
  const bucketStarts = getXValues([layer]);
  const smallestGap = getSmallestGap(bucketStarts) ?? Infinity;
  const getEnd = getLayerBucketEnd(layer) ?? ((bucketStart: number) => bucketStart + smallestGap);
  const snappedX = new Map<XYOverlayDatum, number>();
  for (const datum of overlay.data) {
    const bucketStart = findBucketStart(bucketStarts, getEnd, getOverlayX(overlay, datum));
    if (bucketStart !== undefined) {
      snappedX.set(datum, bucketStart);
    }
  }
  return {
    data: overlay.data.filter((datum) => snappedX.has(datum)),
    xAccessor: (datum) => snappedX.get(datum) ?? NaN,
  };
};

/**
 * Pairs each overlay with the Y axis group and the scales of its layer, mirroring the layer's own series.
 * Overlays are dropped when their layer is not drawn or has a categorical X axis, where numeric `x` values cannot be placed.
 * On histogram layers, points are snapped to the layer buckets so they never change the base chart's interval.
 * Without a known interval, a bucket is assumed to span the smallest gap between buckets.
 */
export const getOverlaySeriesConfigs = (
  overlays: readonly XYOverlay[],
  yAxesConfiguration: GroupsConfiguration,
  dataLayers: readonly CommonXYDataLayerConfig[],
  defaultXScaleType: XScaleType,
  getLayerBucketEnd: GetLayerBucketEnd = () => undefined
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
    const { data, xAccessor: overlayXAccessor } = layer.isHistogram
      ? snapToBuckets(overlay, layer, getLayerBucketEnd)
      : overlay;
    return [
      {
        overlay,
        groupId: axis.groupId,
        xScaleType,
        yScaleType,
        data,
        xAccessor: overlayXAccessor,
      },
    ];
  });

interface OverlayPointsProps {
  overlays: readonly XYOverlay[];
  yAxesConfiguration: GroupsConfiguration;
  dataLayers: readonly CommonXYDataLayerConfig[];
  defaultXScaleType: XScaleType;
  getLayerBucketEnd: GetLayerBucketEnd;
}

export const OverlayPoints = ({
  overlays,
  yAxesConfiguration,
  dataLayers,
  defaultXScaleType,
  getLayerBucketEnd,
}: OverlayPointsProps) => {
  const { euiTheme } = useEuiTheme();
  const color = euiTheme.colors.vis.euiColorVis6;

  return (
    <>
      {getOverlaySeriesConfigs(
        overlays,
        yAxesConfiguration,
        dataLayers,
        defaultXScaleType,
        getLayerBucketEnd
      ).map(({ overlay, groupId, xScaleType, yScaleType, data, xAccessor }) => {
        return (
          <BubbleSeries<XYOverlayDatum>
            key={getOverlaySpecId(overlay)}
            id={getOverlaySpecId(overlay)}
            name={overlay.title}
            groupId={groupId}
            xScaleType={xScaleType}
            yScaleType={yScaleType}
            xAccessor={xAccessor}
            yAccessors={[overlay.yAccessor]}
            data={data}
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
      })}
    </>
  );
};
