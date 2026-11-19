/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { APP_HEADER_TEST_SUBJECTS } from './test_subjects';

/**
 * Approximate the real title line so the layout does not jump when content arrives.
 * EuiTitle size s/xs is ~24px tall.
 */
const TITLE_WIDTH_PX = 200;

export const AppHeaderSkeletonTitle = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj={APP_HEADER_TEST_SUBJECTS.skeleton}>
      <EuiSkeletonRectangle width={TITLE_WIDTH_PX} height={euiTheme.size.l} borderRadius="m" />
    </div>
  );
});

AppHeaderSkeletonTitle.displayName = 'AppHeaderSkeletonTitle';
