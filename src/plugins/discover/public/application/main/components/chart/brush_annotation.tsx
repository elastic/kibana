/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { RectAnnotation } from '@elastic/charts';

interface BrushAnnotationProps {
  id: string;
  min: number;
  max: number;
}

export const MlBrushAnnotation: FC<BrushAnnotationProps> = ({ id, min, max }) => {
  return (
    <RectAnnotation
      dataValues={[
        {
          coordinates: {
            x0: min,
            x1: max,
            y0: 0,
            y1: 1000000000,
          },
          details: id,
        },
      ]}
      id={`rect_annotation_${id}`}
      style={{
        strokeWidth: 1,
        stroke: '#e8eaeb',
        fill: '#e8eaeb',
        opacity: 1,
      }}
      hideTooltips={true}
    />
  );
};
