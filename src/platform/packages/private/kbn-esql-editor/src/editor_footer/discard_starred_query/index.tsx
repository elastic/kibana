/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DiscardStarredQueryModalProps } from './discard_starred_query_modal';

const Fallback = () => <div />;

const LazyDiscardStarredQueryModal = React.lazy(() => import('./discard_starred_query_modal'));
export const DiscardStarredQueryModal = (props: DiscardStarredQueryModalProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyDiscardStarredQueryModal {...props} />
  </React.Suspense>
);
