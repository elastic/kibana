/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EmbeddingView, type DataPoint, type EmbeddingViewProps } from '../embedding_atlas_runtime';
import type { EmbeddingExplorerPoint } from '../../../../common';

export interface AtlasEmbeddingViewProps {
  onHoverChange?: (pointId: string | null) => void;
  onSelectionChange: (pointId: string | null) => void;
  points: readonly EmbeddingExplorerPoint[];
  selectedPointIds: readonly string[];
}

const getCoordinateKey = (x: number, y: number) => `${x}:${y}`;

const getSelectionPoint = (
  point: EmbeddingExplorerPoint | undefined,
  categoryIndexLookup: Map<string, number>
): DataPoint | null => {
  if (!point) {
    return null;
  }

  return {
    category: categoryIndexLookup.get(point.category) ?? 0,
    fields: point.metadata,
    identifier: point.id,
    text: point.summary,
    x: point.x,
    y: point.y,
  };
};

export const AtlasEmbeddingView = ({
  onHoverChange,
  onSelectionChange,
  points,
  selectedPointIds,
}: AtlasEmbeddingViewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const embeddingViewRef = useRef<EmbeddingView | null>(null);
  const initialEmbeddingViewPropsRef = useRef<EmbeddingViewProps | null>(null);
  const categoryIndexLookup = useMemo(
    () =>
      new Map(
        Array.from(new Set(points.map((point) => point.category))).map((category, index) => [
          category,
          index,
        ])
      ),
    [points]
  );

  const pointLookupById = useMemo(
    () => new Map(points.map((point) => [point.id, point])),
    [points]
  );

  const pointLookupByCoordinate = useMemo(
    () => new Map(points.map((point) => [getCoordinateKey(point.x, point.y), point])),
    [points]
  );

  const data = useMemo(
    () => ({
      category: Uint8Array.from(points, (point) => categoryIndexLookup.get(point.category) ?? 0),
      x: Float32Array.from(points, (point) => point.x),
      y: Float32Array.from(points, (point) => point.y),
    }),
    [categoryIndexLookup, points]
  );

  const selection = useMemo(
    () =>
      selectedPointIds
        .map((pointId) => getSelectionPoint(pointLookupById.get(pointId), categoryIndexLookup))
        .filter((point): point is DataPoint => point !== null),
    [categoryIndexLookup, pointLookupById, selectedPointIds]
  );

  const querySelection = useCallback(
    async (x: number, y: number, unitDistance: number) => {
      let nextSelection: EmbeddingExplorerPoint | undefined;
      let smallestDistance = Number.POSITIVE_INFINITY;
      const maxDistance = unitDistance * 10;

      points.forEach((point) => {
        const distance = Math.hypot(point.x - x, point.y - y);

        if (distance < smallestDistance) {
          smallestDistance = distance;
          nextSelection = point;
        }
      });

      return smallestDistance <= maxDistance
        ? getSelectionPoint(nextSelection, categoryIndexLookup)
        : null;
    },
    [categoryIndexLookup, points]
  );

  const resolvePointId = useCallback(
    (point: DataPoint | null) => {
      if (!point) {
        return null;
      }

      if (typeof point.identifier === 'string' && pointLookupById.has(point.identifier)) {
        return point.identifier;
      }

      return pointLookupByCoordinate.get(getCoordinateKey(point.x, point.y))?.id ?? null;
    },
    [pointLookupByCoordinate, pointLookupById]
  );

  const handleSelectionChange = useCallback(
    (nextSelection: DataPoint[] | null) => {
      const pointId = resolvePointId(nextSelection?.[0] ?? null);
      onSelectionChange(pointId);
    },
    [onSelectionChange, resolvePointId]
  );

  const handleTooltipChange = useCallback(
    (tooltip: DataPoint | null) => {
      onHoverChange?.(resolvePointId(tooltip));
    },
    [onHoverChange, resolvePointId]
  );

  const embeddingViewProps = useMemo<EmbeddingViewProps>(
    () => ({
      config: {
        autoLabelEnabled: false,
        downsampleMaxPoints: 5000,
        mode: 'density',
        pointSize: null,
      },
      data,
      height: 560,
      onSelection: handleSelectionChange,
      onTooltip: handleTooltipChange,
      querySelection,
      selection: selection.length ? selection : null,
    }),
    [data, handleSelectionChange, handleTooltipChange, querySelection, selection]
  );

  if (initialEmbeddingViewPropsRef.current === null) {
    initialEmbeddingViewPropsRef.current = embeddingViewProps;
  }

  useEffect(() => {
    const initialEmbeddingViewProps = initialEmbeddingViewPropsRef.current;

    if (!containerRef.current || !initialEmbeddingViewProps) {
      return;
    }

    embeddingViewRef.current = new EmbeddingView(containerRef.current, initialEmbeddingViewProps);

    return () => {
      embeddingViewRef.current?.destroy();
      embeddingViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    embeddingViewRef.current?.update(embeddingViewProps);
  }, [embeddingViewProps]);

  return (
    <div
      data-test-subj="labsEmbeddingExplorerAtlasView"
      ref={containerRef}
      style={{ display: 'flex', width: '100%' }}
    >
      {null}
    </div>
  );
};
