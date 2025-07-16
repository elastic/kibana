/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';

export function StatusBadge({ status }: { status: ExecutionStatus }) {
  switch (status) {
    case 'completed':
      return <EuiBadge color="success">{status}</EuiBadge>;
    case 'failed':
      return <EuiBadge color="danger">{status}</EuiBadge>;
    case 'pending':
      return <EuiBadge color="subdued">{status}</EuiBadge>;
    case 'running':
      return (
        <EuiBadge color="subdued" iconType={() => <EuiLoadingSpinner size="s" />}>
          &nbsp;{status}
        </EuiBadge>
      );
    case 'waiting_for_input':
    case 'cancelled':
    case 'skipped':
    default:
      return <EuiBadge color="subdued">{status}</EuiBadge>;
  }
}
