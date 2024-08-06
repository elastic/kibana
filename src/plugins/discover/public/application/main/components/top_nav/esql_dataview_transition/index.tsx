/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { ESQLToDataViewTransitionModalProps } from './esql_dataview_transition_modal';

const Fallback = () => <div />;

const LazyESQLToDataViewTransitionModal = React.lazy(
  () => import('./esql_dataview_transition_modal')
);
export const ESQLToDataViewTransitionModal = (props: ESQLToDataViewTransitionModalProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyESQLToDataViewTransitionModal {...props} />
  </React.Suspense>
);
