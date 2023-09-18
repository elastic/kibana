/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { QueryBarTopRowProps } from './query_bar_top_row';
import type { QueryStringInputProps } from './query_string_input';

const Fallback = () => <div />;

const LazyQueryBarTopRow = React.lazy(() => import('./query_bar_top_row'));

export const QueryBarTopRow = <QT extends AggregateQuery | Query = Query>(
  props: QueryBarTopRowProps<QT>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryBarTopRow {...(props as unknown as QueryBarTopRowProps<AggregateQuery>)} />
  </React.Suspense>
);

const LazyQueryStringInputUI = React.lazy(() => import('./query_string_input'));

export const QueryStringInput = (props: QueryStringInputProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryStringInputUI {...props} />
  </React.Suspense>
);

export type { QueryStringInputProps };
