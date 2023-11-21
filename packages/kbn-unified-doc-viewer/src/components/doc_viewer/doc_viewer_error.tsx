/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';

interface Props {
  error: Error | string;
}

const DocViewerErrorWrapper = ({ error }: Props) => {
  throw error;
};

export const DocViewerError = ({ error }: Props) => (
  <EuiErrorBoundary data-test-subj="docViewerError">
    <DocViewerErrorWrapper error={error} />
  </EuiErrorBoundary>
);
