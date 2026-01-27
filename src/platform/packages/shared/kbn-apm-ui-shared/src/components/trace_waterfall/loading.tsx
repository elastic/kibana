/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function Loading() {
  return (
    <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          {i18n.translate(
            'xpack.apm.traceWaterfallEmbeddable.loadingTraceWaterfallSkeletonTextLabel',
            { defaultMessage: 'Loading trace waterfall summary' }
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
