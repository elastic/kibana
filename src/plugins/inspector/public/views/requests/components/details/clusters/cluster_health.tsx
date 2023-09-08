/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiText } from '@elastic/eui';

interface Props {
  count?: number;
  status: ClusterSearchStatus;
}

export function ClusterHealth({ count, status }: Props) {
  if (typeof count === 'number' && count === 0) {
    return null;
  }

  let color = 'subdued';
  let statusLabel = status;
  if (status === 'successful') {
    color = 'success';
    statusLabel = i18n.translate('inspector.requests.clustersTable.successfulLabel', {
      defaultMessage: 'successful',
    });
  } else if (status === 'partial') {
    color = 'warning';
    statusLabel = i18n.translate('inspector.requests.clustersTable.partialLabel', {
      defaultMessage: 'partial',
    });
  } else if (status === 'skipped') {
    color = 'warning';
    statusLabel = i18n.translate('inspector.requests.clustersTable.skippedLabel', {
      defaultMessage: 'skipped',
    });
  } else if (status === 'failed') {
    color = 'danger';
    statusLabel = i18n.translate('inspector.requests.clustersTable.failedLabel', {
      defaultMessage: 'failed',
    });
  }

  const label = typeof count === 'number' ? `${count} ${statusLabel}` : statusLabel;
  return (
    <EuiHealth color={color}>
      <EuiText size="xs" color="subdued">
        {label}
      </EuiText>
    </EuiHealth>
  );
}