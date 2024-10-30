/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { viewBoxToString } from '../../../common/lib';
import { ShapeProps, SvgConfig, SvgElementTypes } from './types';

export const getShapeComponent = (svgParams: SvgConfig) =>
  function Shape({
    shapeAttributes,
    shapeContentAttributes,
    children,
    textAttributes,
  }: React.PropsWithChildren<ShapeProps>) {
    const {
      viewBox: initialViewBox,
      shapeProps: defaultShapeContentAttributes,
      textAttributes: defaultTextAttributes,
      shapeType,
    } = svgParams;

    const viewBox = shapeAttributes?.viewBox
      ? viewBoxToString(shapeAttributes?.viewBox)
      : viewBoxToString(initialViewBox);

    const SvgContentElement = getShapeContentElement(shapeType);

    const TextElement = textAttributes
      ? React.forwardRef<SVGTextElement>((props, ref) => <text {...props} ref={ref} />)
      : null;

    return (
      <svg xmlns="http://www.w3.org/2000/svg" {...{ ...(shapeAttributes || {}), viewBox }}>
        <SvgContentElement
          {...{ ...defaultShapeContentAttributes, ...(shapeContentAttributes || {}) }}
        />
        {children}
        {TextElement && (
          <TextElement {...{ ...(defaultTextAttributes || {}), ...(textAttributes || {}) }}>
            {textAttributes?.textContent}
          </TextElement>
        )}
      </svg>
    );
  };

export function getShapeContentElement(type?: SvgElementTypes) {
  switch (type) {
    case SvgElementTypes.circle:
      return React.forwardRef<SVGCircleElement | null>((props, ref) => (
        <circle {...props} ref={ref} />
      ));
    case SvgElementTypes.rect:
      return React.forwardRef<SVGRectElement | null>((props, ref) => <rect {...props} ref={ref} />);
    case SvgElementTypes.path:
      return React.forwardRef<SVGPathElement | null>((props, ref) => <path {...props} ref={ref} />);
    default:
      return React.forwardRef<SVGPolygonElement | null>((props, ref) => (
        <polygon {...props} ref={ref} />
      ));
  }
}

export const createShape = (props: SvgConfig) => {
  return {
    Component: getShapeComponent(props),
    data: props,
  };
};

export type ShapeType = ReturnType<typeof createShape>;
