/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Handle, Position } from '@xyflow/react';
import React from 'react';
import { errorHandleStyle, handleAlongStyle, STEP_PORT } from './port_geometry';

/**
 * Source handles of a committed node. `if` nodes expose `then` / `else`; a step
 * with an error route exposes `step` + `fallback`; otherwise one default handle.
 * `fallback` is always on the bottom edge (see `errorHandleStyle`).
 */
export function NodeSourceHandles({
  isIfNode,
  hasFallback,
  sourceHandlePos,
  isHorizontal,
}: {
  isIfNode: boolean;
  hasFallback: boolean;
  sourceHandlePos: Position;
  isHorizontal: boolean;
}) {
  if (isIfNode) {
    return (
      <>
        <Handle
          type="source"
          id="then"
          position={sourceHandlePos}
          style={{ opacity: 0, ...handleAlongStyle(STEP_PORT, isHorizontal) }}
        />
        <Handle
          type="source"
          id="else"
          position={sourceHandlePos}
          style={{ opacity: 0, ...handleAlongStyle(STEP_PORT, isHorizontal) }}
        />
        {hasFallback && (
          <Handle
            type="source"
            id="fallback"
            position={Position.Bottom}
            style={{ opacity: 0, ...errorHandleStyle() }}
          />
        )}
      </>
    );
  }
  if (hasFallback) {
    return (
      <>
        <Handle
          type="source"
          id="step"
          position={sourceHandlePos}
          style={{ opacity: 0, ...handleAlongStyle(STEP_PORT, isHorizontal) }}
        />
        <Handle
          type="source"
          id="fallback"
          position={Position.Bottom}
          style={{ opacity: 0, ...errorHandleStyle() }}
        />
      </>
    );
  }
  return <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />;
}
