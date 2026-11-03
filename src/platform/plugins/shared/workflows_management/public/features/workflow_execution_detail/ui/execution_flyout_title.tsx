/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { formatExecutionTimestamp } from '../../../shared/ui/use_formatted_date';

interface ExecutionFlyoutTitleProps {
  workflowName: string;
  /** ISO timestamp of when the run started. */
  startedAtIso: string | undefined;
}

export const ExecutionFlyoutTitle = ({ workflowName, startedAtIso }: ExecutionFlyoutTitleProps) => {
  const { settings } = useKibana().services;
  const timeZoneSetting: string | undefined = settings.client.get('dateFormat:tz');
  const startedAt = useMemo(() => (startedAtIso ? new Date(startedAtIso) : null), [startedAtIso]);
  const formattedDate = formatExecutionTimestamp(startedAtIso, 'header', { timeZoneSetting });
  const formattedDateTooltip = formatExecutionTimestamp(startedAtIso, 'tooltip', {
    timeZoneSetting,
  });

  return (
    <div>
      <EuiTitle size="s">
        <h2 css={{ wordBreak: 'break-word' }}>{workflowName}</h2>
      </EuiTitle>
      {formattedDate && startedAt && (
        <EuiToolTip content={formattedDateTooltip} position="top">
          <span tabIndex={0}>
            <EuiText
              size="xs"
              color="subdued"
              css={{ marginTop: '3px' }}
              data-test-subj="workflowExecutionFlyoutStartedAt"
            >
              {formattedDate}
              {' ('}
              <FormattedRelativeEnhanced value={startedAt} />
              {')'}
            </EuiText>
          </span>
        </EuiToolTip>
      )}
    </div>
  );
};
