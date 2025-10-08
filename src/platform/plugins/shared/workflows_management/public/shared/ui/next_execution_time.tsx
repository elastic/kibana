/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';
import { getWorkflowNextExecutionTime } from '../../lib/next_execution_time';
import { useGetFormattedDateTime } from './use_formatted_date';

interface NextExecutionTimeProps {
  triggers: WorkflowTrigger[];
}

export function NextExecutionTime({ triggers }: NextExecutionTimeProps) {
  const nextExecutionTime = getWorkflowNextExecutionTime(triggers);
  const getFormattedDateTime = useGetFormattedDateTime();

  if (!nextExecutionTime) {
    return null;
  }

  return (
    <EuiToolTip
      content={i18n.translate('workflows.workflowList.nextExecutionTime.tooltip', {
        defaultMessage: 'Next execution: {date}',
        values: {
          date: getFormattedDateTime(nextExecutionTime),
        },
      })}
    >
      <EuiBadge color="hollow">
        {i18n.translate('workflows.workflowList.nextExecutionTime.nextExecutionTimeText', {
          defaultMessage: 'Next execution: ',
        })}
        <FormattedRelative value={nextExecutionTime} />
      </EuiBadge>
    </EuiToolTip>
  );
}
