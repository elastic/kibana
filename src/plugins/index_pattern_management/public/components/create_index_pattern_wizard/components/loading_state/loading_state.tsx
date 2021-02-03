/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const LoadingState = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center" direction="column" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <h2 style={{ textAlign: 'center' }}>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.loadingState.checkingLabel"
            defaultMessage="Checking for Elasticsearch data"
          />
        </h2>
      </EuiTitle>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
