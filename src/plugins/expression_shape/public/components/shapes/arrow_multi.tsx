/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { ShapeProps, ViewBoxParams } from '../types';
import { viewBoxToString } from '../../../common/lib';

const initialViewBox: ViewBoxParams = {
  minX: 0,
  minY: 0,
  width: 100,
  height: 60,
};

export function ArrowMulti({
  shapeAttributes,
  shapeContentAttributes,
  setViewBoxParams,
}: ShapeProps) {
  useEffect(() => {
    setViewBoxParams(initialViewBox);
  }, [setViewBoxParams]);
  const viewBox = shapeAttributes.viewBox
    ? viewBoxToString(shapeAttributes.viewBox)
    : viewBoxToString(initialViewBox);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...shapeAttributes} viewBox={viewBox}>
      <polygon
        points="5,30 25,10 25,20 75,20 75,10 95,30 75,50 75,40 25,40 25,50"
        {...shapeContentAttributes}
      />
    </svg>
  );
}
