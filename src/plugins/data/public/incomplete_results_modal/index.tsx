/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { OpenIncompleteResultsModalButtonProps } from './open_incomplete_results_modal_button';

const Fallback = () => <div />;

const LazyOpenModalButton = React.lazy(() => import('./open_incomplete_results_modal_button'));
export const OpenIncompleteResultsModalButton = (props: OpenIncompleteResultsModalButtonProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyOpenModalButton {...props} />
  </React.Suspense>
);
