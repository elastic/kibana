/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { XDomain } from '../x_domain';
import { EndzoneTooltipHeader } from './endzone_tooltip_header';
import { isEndzoneBucket } from './utils';

interface Props {
  value: unknown;
  formatter: (value: unknown) => string;
  xDomain?: XDomain;
}

export const TooltipHeader: FC<Props> = ({ value, formatter, xDomain }) => {
  const renderEndzoneHeader =
    xDomain && typeof value === 'number' ? isEndzoneBucket(value, xDomain) : undefined;

  if (renderEndzoneHeader) {
    return <EndzoneTooltipHeader value={formatter(value)} />;
  }

  return <>{formatter(value)}</>;
};
