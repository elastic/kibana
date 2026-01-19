/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { httpStatusCodes } from './http_status_codes';
import { useGetHttpStatusColor } from './use_get_http_status_color';

interface HttpStatusCodeProps {
  code: number;
  showTooltip?: boolean;
}

export function HttpStatusCode({ code, showTooltip = false }: HttpStatusCodeProps) {
  const label = i18n.translate('apmUiShared.statusCodeLabel', {
    defaultMessage: 'Status code',
  });

  const content = (
    <EuiBadge color={useGetHttpStatusColor(code)} data-test-subj="apmUiSharedHttpStatusCodeBadge">
      <EuiText size="xs" data-test-subj="apmUiSharedHttpStatusCodeText">
        {code} {httpStatusCodes[code.toString()]}
      </EuiText>
    </EuiBadge>
  );

  return showTooltip ? (
    <EuiToolTip content={label} aria-label={label}>
      {content}
    </EuiToolTip>
  ) : (
    <> {content}</>
  );
}
