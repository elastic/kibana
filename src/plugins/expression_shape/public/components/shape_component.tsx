/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { ShapeRendererConfig } from '../../common/types';
import { shapes } from './shapes';
import './shape.scss';

interface ShapeComponentProps extends ShapeRendererConfig {
  handlers: IInterpreterRenderHandlers;
  parentNode: HTMLElement;
}

function ShapeComponent({
  handlers,
  parentNode,
  shape: shapeType,
  fill,
  border,
  borderWidth,
  maintainAspect,
}: ShapeComponentProps) {
  const parser = new DOMParser();
  const shapeSvg = parser
    .parseFromString(shapes[shapeType], 'image/svg+xml')
    .getElementsByTagName('svg')
    .item(0)!;

  const shapeContent = shapeSvg.firstElementChild!;

  if (fill) {
    shapeContent.setAttribute('fill', fill);
  }
  if (border) {
    shapeContent.setAttribute('stroke', border);
  }
  const strokeWidth = Math.max(borderWidth, 0);
  shapeContent.setAttribute('stroke-width', String(strokeWidth));
  shapeContent.setAttribute('stroke-miterlimit', '999');
  shapeContent.setAttribute('vector-effect', 'non-scaling-stroke');

  shapeSvg.setAttribute('preserveAspectRatio', maintainAspect ? 'xMidYMid meet' : 'none');
  shapeSvg.setAttribute('overflow', 'visible');

  const initialViewBox = shapeSvg
    .getAttribute('viewBox')!
    .split(' ')
    .map((v) => parseInt(v, 10));

  const draw = () => {
    const width = parentNode.offsetWidth;
    const height = parentNode.offsetHeight;

    // adjust viewBox based on border width
    let [minX, minY, shapeWidth, shapeHeight] = initialViewBox;
    const borderOffset = strokeWidth;

    if (width) {
      const xOffset = (shapeWidth / width) * borderOffset;
      minX -= xOffset;
      shapeWidth += xOffset * 2;
    } else {
      shapeWidth = 0;
    }

    if (height) {
      const yOffset = (shapeHeight / height) * borderOffset;
      minY -= yOffset;
      shapeHeight += yOffset * 2;
    } else {
      shapeHeight = 0;
    }

    shapeSvg.setAttribute('width', String(width));
    shapeSvg.setAttribute('height', String(height));
    shapeSvg.setAttribute('viewBox', [minX, minY, shapeWidth, shapeHeight].join(' '));

    const oldShape = parentNode.firstElementChild;
    if (oldShape) {
      parentNode.removeChild(oldShape);
    }

    parentNode.style.lineHeight = '0';
    parentNode.appendChild(shapeSvg);
  };

  draw();
  handlers.done();
  handlers.event({ name: 'onResize', data: draw }); // debouncing avoided for fluidity

  return <div className="shapeAligner" />;
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ShapeComponent as default };
