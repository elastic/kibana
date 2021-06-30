/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { ShapeProps } from '../types';
import { ShapeHOC } from './shape_hoc';

function ArrowShape({ shapeAttributes, shapeContentAttributes, setInitViewBoxParams }: ShapeProps) {
  useEffect(() => {
    setInitViewBoxParams({
      minX: 0,
      minY: 0,
      width: 100,
      height: 100,
    });
  }, [setInitViewBoxParams]);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...shapeAttributes}>
      <polygon points="0,40 60,40 60,20 95,50 60,80 60,60 0,60" {...shapeContentAttributes} />
    </svg>
  );
}

export const Arrow = ShapeHOC(ArrowShape);
