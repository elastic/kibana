/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { forwardRef, ForwardRefRenderFunction, Ref, useImperativeHandle } from 'react';
import { ShapeProps, SvgConfig } from '../../../presentation_util/public';
import { Shape as ShapeType } from '../../common/types';
import { getShape } from './shapes';

export type Props = {
  shapeType: ShapeType;
  ref: Ref<ShapeRef>;
} & ShapeProps;

export interface ShapeRef {
  getData: () => SvgConfig;
}

const ShapeDrawer: ForwardRefRenderFunction<ShapeRef, Props> = (props, ref) => {
  const { shapeType } = props;
  const Shape = getShape(shapeType);

  if (!Shape) throw new Error("Shape doesn't exist.");

  useImperativeHandle(ref, () => ({ getData: () => Shape.data }), [Shape]);

  return <Shape.Component {...props} />;
};

const ShapeDrawerWithRef = forwardRef(ShapeDrawer);

// eslint-disable-next-line import/no-default-export
export { ShapeDrawerWithRef as default };
