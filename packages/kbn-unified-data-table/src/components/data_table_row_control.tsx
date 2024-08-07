/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import classnames from 'classnames';

export enum Size {
  normal = 'normal',
}

export const DataTableRowControl: React.FC<{ size?: Size }> = ({ size, children }) => {
  const classes = classnames('unifiedDataTable__rowControl', {
    // normalize the size of the control
    [`unifiedDataTable__rowControl--size-${size}`]: size,
  });
  return <span className={classes}>{children}</span>;
};
