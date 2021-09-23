/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { IndexPatternEditorProps } from '../types';

const IndexPatternFlyoutContentContainer = lazy(
  () => import('./index_pattern_flyout_content_container')
);

export const IndexPatternEditorLazy = (props: IndexPatternEditorProps) => (
  <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
    <IndexPatternFlyoutContentContainer {...props} />
  </Suspense>
);
