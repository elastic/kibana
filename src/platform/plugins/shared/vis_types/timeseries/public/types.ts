/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDraggable } from '@elastic/eui';
import type { Panel } from '../common/types';

type PropsOf<T> = T extends React.ComponentType<infer ComponentProps> ? ComponentProps : never;
type FirstArgumentOf<Func> = Func extends (arg1: infer FirstArgument, ...rest: any[]) => any
  ? FirstArgument
  : never;
export type DragHandleProps = FirstArgumentOf<
  Exclude<PropsOf<typeof EuiDraggable>['children'], React.ReactElement>
>['dragHandleProps'];

export type TimeseriesVisParams = Panel;

export type TimeseriesVisDefaultParams = TimeseriesVisParams & {
  id: () => string;
  series: {
    id: () => string;
    metrics: {
      id: () => string;
    };
  };
};
