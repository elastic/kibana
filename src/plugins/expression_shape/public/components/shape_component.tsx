/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { ShapeAttributes, ShapeContentAttributes } from '../../../presentation_util/public';
import { Dimensions, ShapeComponentProps } from './types';
import { shapes } from './shapes';
import { getViewBox } from '../../common/lib';

import './shape.scss';

function ShapeComponent({
  onLoaded,
  parentNode,
  shape: shapeType,
  fill,
  border,
  borderWidth,
  maintainAspect,
}: ShapeComponentProps) {
  const parentNodeDimensions = useResizeObserver(parentNode);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: parentNode.offsetWidth,
    height: parentNode.offsetHeight,
  });

  useEffect(() => {
    setDimensions({
      width: parentNode.offsetWidth,
      height: parentNode.offsetHeight,
    });
    onLoaded();
  }, [parentNode, parentNodeDimensions, onLoaded]);

  const strokeWidth = Math.max(borderWidth, 0);

  const shapeContentAttributes: ShapeContentAttributes = {
    strokeWidth: String(strokeWidth),
    vectorEffect: 'non-scaling-stroke',
    strokeMiterlimit: '999',
  };
  if (fill) shapeContentAttributes.fill = fill;
  if (border) shapeContentAttributes.stroke = border;

  const { width, height } = dimensions;

  const Shape = shapes[shapeType];
  const shapeAttributes: ShapeAttributes = {
    width,
    height,
    overflow: 'visible',
    preserveAspectRatio: maintainAspect ? 'xMidYMid meet' : 'none',
    viewBox: getViewBox(Shape.data.viewBox, {
      borderOffset: strokeWidth,
      width,
      height,
    }),
  };

  parentNode.style.lineHeight = '0';

  return (
    <div className="shapeAligner">
      <Shape.Component
        shapeContentAttributes={shapeContentAttributes}
        shapeAttributes={shapeAttributes}
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ShapeComponent as default };
