/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, RefCallback, useCallback, useEffect, useRef, useState } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { withSuspense } from '@kbn/presentation-util-plugin/public';
import { NodeDimensions, ProgressRendererConfig } from '../../../common/types';
import { ShapeRef, SvgConfig, SvgTextAttributes } from '../reusable/types';
import { getShapeContentElement } from '../reusable/shape_factory';
import { getTextAttributes, getViewBox } from './utils';
import { getId } from '../../../common/lib';
import { getDefaultShapeData } from '../reusable';
import { LazyProgressDrawer } from '../..';

const ProgressDrawer = withSuspense(LazyProgressDrawer);

interface ProgressComponentProps extends ProgressRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

function ProgressComponent({
  onLoaded,
  parentNode,
  shape: shapeType,
  value,
  max,
  valueColor,
  barColor,
  valueWeight,
  barWeight,
  label,
  font,
}: ProgressComponentProps) {
  const parentNodeDimensions = useResizeObserver(parentNode);
  const [dimensions, setDimensions] = useState<NodeDimensions>({
    width: parentNode.offsetWidth,
    height: parentNode.offsetHeight,
  });
  const [shapeData, setShapeData] = useState<SvgConfig>(getDefaultShapeData());
  const shapeRef = useCallback<RefCallback<ShapeRef>>((node) => {
    if (node !== null) {
      setShapeData(node.getData());
    }
  }, []);

  const [totalLength, setTotalLength] = useState<number>(0);

  useEffect(() => {
    setDimensions({
      width: parentNode.offsetWidth,
      height: parentNode.offsetHeight,
    });
    onLoaded();
  }, [onLoaded, parentNode, parentNodeDimensions]);

  const progressRef = useRef<
    SVGCircleElement & SVGPathElement & SVGPolygonElement & SVGRectElement
  >(null);
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    setTotalLength(progressRef.current ? progressRef.current.getTotalLength() : 0);
  }, [shapeType, shapeData, progressRef]);

  const BarProgress = shapeData.shapeType ? getShapeContentElement(shapeData.shapeType) : null;

  const shapeContentAttributes = {
    fill: 'none',
    stroke: barColor,
    strokeWidth: `${barWeight}px`,
  };

  const percent = value / max;
  const to = totalLength * (1 - percent);

  const barProgressAttributes = {
    ...shapeData.shapeProps,
    fill: 'none',
    stroke: valueColor,
    strokeWidth: `${valueWeight}px`,
    strokeDasharray: totalLength,
    strokeDashoffset: Math.max(0, to),
  };

  const { width: labelWidth, height: labelHeight } = textRef.current
    ? textRef.current.getBBox()
    : { width: 0, height: 0 };

  const offset = Math.max(valueWeight, barWeight);

  const updatedTextAttributes = shapeData.textAttributes
    ? getTextAttributes(shapeType, shapeData.textAttributes, offset, label)
    : {};

  const textAttributes: SvgTextAttributes = {
    style: font.spec as CSSProperties,
    ...updatedTextAttributes,
  };

  const updatedViewBox = getViewBox(shapeType, shapeData.viewBox, offset, labelWidth, labelHeight);
  const shapeAttributes = {
    id: getId('svg'),
    ...(dimensions || {}),
    viewBox: updatedViewBox,
  };

  return (
    <div className="shapeAligner">
      <ProgressDrawer
        shapeType={shapeType}
        shapeContentAttributes={{ ...shapeContentAttributes, ref: progressRef }}
        shapeAttributes={shapeAttributes}
        textAttributes={{ ...textAttributes, ref: textRef }}
        ref={shapeRef}
      >
        {BarProgress && <BarProgress {...barProgressAttributes} />}
      </ProgressDrawer>
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { ProgressComponent as default };
