/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { IndexPatternSelectInternalProps } from './index_pattern_select';

const Fallback = () => <div />;

const LazyIndexPatternSelect = React.lazy(() => import('./index_pattern_select'));
export const IndexPatternSelect = (props: IndexPatternSelectInternalProps) => (
  <React.Suspense fallback={<Fallback />}>
    <LazyIndexPatternSelect {...props} />
  </React.Suspense>
);

export * from './create_index_pattern_select';
export type { IndexPatternSelectProps } from './index_pattern_select';
