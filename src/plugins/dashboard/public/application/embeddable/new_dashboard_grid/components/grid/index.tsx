/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { GridStackWidget } from '../../lib/gridstack_helpers';
import { Grid as GridComponent } from './grid';

type ColumnOptions = 12 | 24 | 48;

interface Props {
  gridData?: GridStackWidget[];
  columns?: ColumnOptions;
  guttersize?: number; // in pixels
}

export const Grid: FC<Props> = (props) => <GridComponent {...props} />;
