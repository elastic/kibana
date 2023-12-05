/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiText, EuiTextProps } from '@elastic/eui';
import { HEALTH_HEX_CODES } from './gradient';

interface Props {
  count?: number;
  status: string;
  textProps?: EuiTextProps;
}

const defaultTextProps: EuiTextProps = {
  size: 'xs',
  color: 'subdued',
};

export function ClusterHealth({ count, status, textProps = defaultTextProps }: Props) {
  if (typeof count === 'number' && count === 0) {
    return null;
  }

  let color = 'subdued';
  let statusLabel = status;
  if (status === 'successful') {
    color = HEALTH_HEX_CODES.successful;
    statusLabel = i18n.translate('inspector.requests.clusters.successfulLabel', {
      defaultMessage: 'successful',
    });
  } else if (status === 'partial') {
    color = HEALTH_HEX_CODES.partial;
    statusLabel = i18n.translate('inspector.requests.clusters.partialLabel', {
      defaultMessage: 'partial',
    });
  } else if (status === 'skipped') {
    color = HEALTH_HEX_CODES.skipped;
    statusLabel = i18n.translate('inspector.requests.clusters.skippedLabel', {
      defaultMessage: 'skipped',
    });
  } else if (status === 'failed') {
    color = HEALTH_HEX_CODES.failed;
    statusLabel = i18n.translate('inspector.requests.clusters.failedLabel', {
      defaultMessage: 'failed',
    });
  }

  const label = typeof count === 'number' ? `${count} ${statusLabel}` : statusLabel;
  return (
    <EuiHealth color={color}>
      <EuiText {...textProps}>{label}</EuiText>
    </EuiHealth>
  );
}
