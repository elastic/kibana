/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiTextProps } from '@elastic/eui';
import { EuiHealth, EuiText } from '@elastic/eui';
import { useHealthHexCodes } from './gradient';

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
  const healthHexCodes = useHealthHexCodes();
  if (typeof count === 'number' && count === 0) {
    return null;
  }

  let color = 'subdued';
  let statusLabel = status;
  if (status === 'successful') {
    color = healthHexCodes.successful;
    statusLabel = i18n.translate('inspector.requests.clusters.successfulLabel', {
      defaultMessage: 'successful',
    });
  } else if (status === 'partial') {
    color = healthHexCodes.partial;
    statusLabel = i18n.translate('inspector.requests.clusters.partialLabel', {
      defaultMessage: 'partial',
    });
  } else if (status === 'skipped') {
    color = healthHexCodes.skipped;
    statusLabel = i18n.translate('inspector.requests.clusters.skippedLabel', {
      defaultMessage: 'skipped',
    });
  } else if (status === 'failed') {
    color = healthHexCodes.failed;
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
