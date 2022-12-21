/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiLoadingSpinner } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

export const LoadingIndices = ({ ...rest }) => (
  <EuiFlexGroup
    justifyContent="center"
    alignItems="center"
    direction="column"
    gutterSize="s"
    {...rest}
  >
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <h3 className="eui-textCenter">
          <FormattedMessage
            id="indexPatternEditor.loadingHeader"
            defaultMessage="Looking for matching indices…"
          />
        </h3>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);
