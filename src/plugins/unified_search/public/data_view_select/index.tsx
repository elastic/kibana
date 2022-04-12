/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataViewSelectInternalProps } from './data_view_select';

const Fallback = () => <div />;

const LazyDataViewSelect = React.lazy(() => import('./data_view_select'));
export const DataViewSelect = (props: DataViewSelectInternalProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyDataViewSelect {...props} />
  </React.Suspense>
);

export * from './create_data_view_select';
export type { DataViewSelectProps } from './data_view_select';
