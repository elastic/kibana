/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import classnames from 'classnames';

export enum Size {
  normal = 'normal',
}

export const DataTableRowControl: React.FC<React.PropsWithChildren<{ size?: Size }>> = ({
  size,
  children,
}) => {
  const classes = classnames('unifiedDataTable__rowControl', {
    // normalize the size of the control
    [`unifiedDataTable__rowControl--size-${size}`]: size,
  });
  return <span className={classes}>{children}</span>;
};
