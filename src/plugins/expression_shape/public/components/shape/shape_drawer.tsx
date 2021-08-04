/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { Ref } from 'react';
import { ShapeDrawer, ShapeRef, ShapeDrawerComponentProps } from '../reusable';
import { getShape } from './shapes';

const ShapeDrawerComponent = React.forwardRef(
  (props: ShapeDrawerComponentProps, ref: Ref<ShapeRef>) => (
    <ShapeDrawer {...props} ref={ref} getShape={getShape} />
  )
);

// eslint-disable-next-line import/no-default-export
export { ShapeDrawerComponent as default };
