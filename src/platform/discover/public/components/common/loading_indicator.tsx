/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiLoadingElastic } from '@elastic/eui';
import React from 'react';

interface Props {
  type?: 'spinner' | 'elastic';
}

export const LoadingIndicator = ({ type = 'spinner' }: Props) => {
  return (
    <EuiFlexGroup justifyContent="spaceAround" alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        {type === 'spinner' ? <EuiLoadingSpinner size="l" /> : <EuiLoadingElastic size="xxl" />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
