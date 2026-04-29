/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type { FieldStatsProps, FieldStatsServices, FieldStatsState } from './field_stats';
import type {
  FieldTopValuesBucketProps,
  FieldTopValuesBucketParams,
} from './field_top_values_bucket';

const Fallback = () => <Fragment />;

const LazyFieldTopValuesBucket = React.lazy(() => import('./field_top_values_bucket'));
const LazyFieldStats = React.lazy(() => import('./field_stats'));

const WrappedFieldTopValuesBucket: React.FC<FieldTopValuesBucketProps> = (props) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFieldTopValuesBucket {...props} />
  </React.Suspense>
);

const WrappedFieldStats: React.FC<FieldStatsProps> = (props) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFieldStats {...props} />
  </React.Suspense>
);

export const FieldStats = WrappedFieldStats;
export const FieldTopValuesBucket = WrappedFieldTopValuesBucket;
export type {
  FieldStatsProps,
  FieldStatsServices,
  FieldStatsState,
  FieldTopValuesBucketProps,
  FieldTopValuesBucketParams,
};
