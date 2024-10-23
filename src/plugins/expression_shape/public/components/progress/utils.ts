/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Progress, ViewBoxParams } from '../../../common';
import { SvgTextAttributes } from '../reusable';

type GetViewBox = (
  shapeType: Progress,
  initialViewBox: ViewBoxParams,
  offset: number,
  labelWidth: number,
  labelHeight: number
) => ViewBoxParams;

type GetViewBoxArguments = Parameters<GetViewBox>;
type GetViewBoxParam = (...args: GetViewBoxArguments) => number;

const getMinX: GetViewBoxParam = (shapeType, viewBox, offset = 0) => {
  let { minX } = viewBox;

  if (shapeType !== Progress.HORIZONTAL_BAR) {
    minX -= offset / 2;
  }

  return minX;
};

const getMinY: GetViewBoxParam = (shapeType, viewBox, offset = 0, labelWidth, labelHeight = 0) => {
  let { minY } = viewBox;

  if (shapeType === Progress.SEMICIRCLE) {
    minY -= offset / 2;
  }
  if (shapeType !== Progress.SEMICIRCLE && shapeType !== Progress.VERTICAL_BAR) {
    minY -= offset / 2;
  }
  if (shapeType === Progress.VERTICAL_BAR || shapeType === Progress.VERTICAL_PILL) {
    minY -= labelHeight;
  }

  return minY;
};

const getWidth: GetViewBoxParam = (shapeType, viewBox, offset = 0, labelWidth = 0) => {
  let { width } = viewBox;

  if (shapeType !== Progress.HORIZONTAL_BAR) {
    width += offset;
  }
  if (shapeType === Progress.HORIZONTAL_BAR || shapeType === Progress.HORIZONTAL_PILL) {
    width += labelWidth;
  }

  return width;
};

const getHeight: GetViewBoxParam = (
  shapeType,
  viewBox,
  offset = 0,
  labelWidth = 0,
  labelHeight = 0
) => {
  let { height } = viewBox;

  if (shapeType === Progress.SEMICIRCLE) {
    height += offset / 2;
  }
  if (shapeType !== Progress.SEMICIRCLE && shapeType !== Progress.VERTICAL_BAR) {
    height += offset;
  }
  if (shapeType === Progress.VERTICAL_BAR || shapeType === Progress.VERTICAL_PILL) {
    height += labelHeight;
  }

  return height;
};

const updateMinxAndWidthIfNecessary = (
  shapeType: Progress,
  labelWidth: number,
  minX: number,
  width: number
) => {
  if (
    (shapeType === Progress.VERTICAL_BAR || shapeType === Progress.VERTICAL_PILL) &&
    labelWidth > width
  ) {
    minX = -labelWidth / 2;
    width = labelWidth;
  }
  return [minX, width];
};

export const getViewBox: GetViewBox = function (
  shapeType,
  viewBox,
  offset = 0,
  labelWidth = 0,
  labelHeight = 0
): ViewBoxParams {
  const args: GetViewBoxArguments = [shapeType, viewBox, offset, labelWidth, labelHeight];
  const minX = getMinX(...args);
  const minY = getMinY(...args);
  const width = getWidth(...args);
  const height = getHeight(...args);
  const [updatedMinX, updatedWidth] = updateMinxAndWidthIfNecessary(
    shapeType,
    labelWidth,
    minX,
    width
  );
  return { minX: updatedMinX, minY, width: updatedWidth, height };
};

export function getTextAttributes(
  shapeType: Progress,
  textAttributes: SvgTextAttributes,
  offset: number = 0,
  label: string | boolean = ''
) {
  if (!label) {
    return textAttributes;
  }

  let { x, y, textContent } = textAttributes;

  textContent = label ? label.toString() : '';

  if (shapeType === Progress.HORIZONTAL_PILL) {
    x = parseInt(String(x)!, 10) + offset / 2;
  }
  if (shapeType === Progress.VERTICAL_PILL) {
    y = parseInt(String(y)!, 10) - offset / 2;
  }
  if (shapeType === Progress.HORIZONTAL_BAR || shapeType === Progress.HORIZONTAL_PILL) {
    x = parseInt(String(x)!, 10);
  }

  return { x, y, textContent };
}
