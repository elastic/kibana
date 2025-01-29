/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, EuiLoadingElastic } from '@elastic/eui';
import React from 'react';

interface Props {
  type?: 'spinner' | 'elastic';
}

export const LoadingIndicator = ({ type = 'spinner' }: Props) => {
  return (
    <EuiEmptyPrompt
      icon={type === 'spinner' ? <EuiLoadingSpinner size="l" /> : <EuiLoadingElastic size="xxl" />}
    />
  );
};
