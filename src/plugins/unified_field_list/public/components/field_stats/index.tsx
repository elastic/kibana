/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import type { FieldStatsProps, FieldStatsServices } from './field_stats';

const Fallback = () => <Fragment />;

const LazyFieldStats = React.lazy(() => import('./field_stats'));
const WrappedFieldStats: React.FC<FieldStatsProps> = (props) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyFieldStats {...props} />
  </React.Suspense>
);

export const FieldStats = WrappedFieldStats;
export type { FieldStatsProps, FieldStatsServices };
