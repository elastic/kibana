/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseEdge, getStraightPath, type StraightEdgeProps } from '@xyflow/react';
import React, { memo } from 'react';

/**
 * Extends past RF handle anchors so the stroke meets node chrome (borders, transforms).
 * Invisible handles keep anchor geometry; extra length closes the remaining visual gap.
 */
const LENGTHEN_PX = 36;

export const EventTraceExtendedStraightEdge = memo(function EventTraceExtendedStraightEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  interactionWidth,
  ...rest
}: StraightEdgeProps) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.hypot(dx, dy);
  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;
  if (len > 0.001) {
    const ux = dx / len;
    const uy = dy / len;
    sx = sourceX - ux * LENGTHEN_PX;
    sy = sourceY - uy * LENGTHEN_PX;
    tx = targetX + ux * LENGTHEN_PX;
    ty = targetY + uy * LENGTHEN_PX;
  }
  const [path, labelX, labelY] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });
  return (
    <BaseEdge
      id={id}
      path={path}
      labelX={labelX}
      labelY={labelY}
      interactionWidth={interactionWidth ?? 0}
      {...rest}
    />
  );
});

EventTraceExtendedStraightEdge.displayName = 'EventTraceExtendedStraightEdge';
