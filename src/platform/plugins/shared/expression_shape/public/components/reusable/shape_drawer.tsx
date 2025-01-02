/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, Ref, useImperativeHandle } from 'react';
import { ShapeDrawerProps, ShapeRef } from './types';

function ShapeDrawerComponent(props: ShapeDrawerProps, ref: Ref<ShapeRef>) {
  const { shapeType, getShape } = props;
  const Shape = getShape(shapeType);

  if (!Shape) throw new Error("Shape doesn't exist.");

  useImperativeHandle(ref, () => ({ getData: () => Shape.data }), [Shape]);

  return <Shape.Component {...props} />;
}

export const ShapeDrawer = forwardRef(ShapeDrawerComponent);
