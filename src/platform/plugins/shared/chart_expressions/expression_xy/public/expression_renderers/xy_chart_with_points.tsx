/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { LayerTypes } from '../../common/constants';
import type { PointsLayerConfigResult } from '../../common/types';
import type { XYChartRenderProps } from '../components/xy_chart';
import type { PointData } from '../helpers/points';
import { mapPointsResponse, type EsqlRawResponse } from '../helpers/metric_points';

/**
 * Wraps XYChartReportable to add a client-side fetch for any points layers found
 * in args.layers. Each points layer carries a self-contained ES|QL query; this
 * component runs those queries in parallel via the data.search service and feeds
 * the results to XYChartReportable as the `pointsData` prop, keyed by layerId.
 */
export function XYChartWithPoints(
  props: XYChartRenderProps & {
    XYChartReportable: React.ComponentType<XYChartRenderProps>;
  }
) {
  const { XYChartReportable, data, args, ...rest } = props;
  const { search } = data;
  const [pointsData, setPointsData] = useState<Record<string, PointData[]>>({});

  const pointsLayers = (args.layers ?? [])
    .filter((layer) => layer.layerType === LayerTypes.POINTS)
    .map((layer) => layer as unknown as PointsLayerConfigResult);

  // Stable string dep: effect only re-runs when layer configs actually change,
  // not on every render when args is a new object reference.
  const layersKey = pointsLayers.map((l) => `${l.layerId}:${l.query}:${l.yAccessor}`).join('|');

  // Ref so the effect always reads the current layer list without it being a dep.
  const pointsLayersRef = useRef(pointsLayers);
  pointsLayersRef.current = pointsLayers;

  useEffect(() => {
    if (!layersKey) return;

    const subscriptions = pointsLayersRef.current.map((layer) =>
      search
        .search({ params: { query: layer.query, dropNullColumns: true } }, { strategy: 'esql' })
        .subscribe({
          next: (response) => {
            // rawResponse from the esql strategy is the raw ES|QL body:
            //   { columns: [{name, type}], values: [[...], ...] }
            // It is NOT a Datatable (which uses `id` and `rows`).
            const raw = response?.rawResponse as unknown as EsqlRawResponse;
            if (raw && Array.isArray(raw.columns) && Array.isArray(raw.values)) {
              setPointsData((prev) => ({
                ...prev,
                [layer.layerId]: mapPointsResponse(raw, layer.yAccessor),
              }));
            }
          },
          error: () => {
            // fetch failed for this layer — leave existing data in place
          },
        })
    );

    return () => subscriptions.forEach((sub) => sub.unsubscribe());
  }, [search, layersKey]);

  if (pointsLayers.length === 0) {
    return <XYChartReportable {...rest} args={args} data={data} />;
  }

  return <XYChartReportable {...rest} args={args} data={data} pointsData={pointsData} />;
}
