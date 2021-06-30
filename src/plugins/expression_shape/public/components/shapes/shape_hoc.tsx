/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { JSXElementConstructor, useEffect, useState } from 'react';
import { viewBoxToString } from '../../../common/lib';
import { ShapeHocProps, ViewBoxParams } from '../types';

export const ShapeHOC = (Component: JSXElementConstructor<any>) =>
  function HocComponent({
    shapeAttributes,
    shapeContentAttributes,
    setViewBoxParams,
  }: ShapeHocProps) {
    const [initialViewBox, setInitialViewBox] = useState<ViewBoxParams>();

    useEffect(() => {
      setViewBoxParams(initialViewBox);
    }, [initialViewBox, setViewBoxParams]);

    const viewBox = shapeAttributes.viewBox
      ? viewBoxToString(shapeAttributes.viewBox)
      : viewBoxToString(initialViewBox);

    return (
      <Component
        setInitViewBoxParams={setInitialViewBox}
        shapeAttributes={{ ...shapeAttributes, viewBox }}
        shapeContentAttributes={shapeContentAttributes}
      />
    );
  };
