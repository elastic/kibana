/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { QueryBarTopRowProps } from './query_bar_top_row';
import type { QueryStringInputProps } from './query_string_input';

const Fallback = () => <div />;

const LazyQueryBarTopRow = React.lazy(async () => {
  const { QueryBarTopRow } = await import('../ui_module');
  return { default: QueryBarTopRow };
});

export const QueryBarTopRow = <QT extends AggregateQuery | Query = Query>(
  props: QueryBarTopRowProps<QT>
) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryBarTopRow {...(props as unknown as QueryBarTopRowProps<AggregateQuery>)} />
  </React.Suspense>
);

const LazyQueryStringInputUI = React.lazy(async () => {
  const { QueryStringInput } = await import('../ui_module');
  return { default: QueryStringInput };
});

export const QueryStringInput = (props: QueryStringInputProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyQueryStringInputUI {...props} />
  </React.Suspense>
);

export type { QueryStringInputProps };
