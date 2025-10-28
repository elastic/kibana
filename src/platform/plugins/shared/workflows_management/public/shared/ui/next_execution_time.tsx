/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionHistoryModel } from '@kbn/workflows';
import { useGetFormattedDateTime } from './use_formatted_date';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';
import { getWorkflowNextExecutionTime } from '../../lib/next_execution_time';

interface NextExecutionTimeProps {
  triggers: WorkflowTrigger[];
  history: WorkflowExecutionHistoryModel[];
  children: React.ReactElement;
}

export function NextExecutionTime({ triggers, history, children }: NextExecutionTimeProps) {
  const nextExecutionTime = getWorkflowNextExecutionTime(triggers, history);
  const getFormattedDateTime = useGetFormattedDateTime();

  return (
    <EuiToolTip
      content={
        nextExecutionTime &&
        i18n.translate('workflows.workflowList.nextExecutionTime.tooltip', {
          defaultMessage: 'Next execution: {date}',
          values: {
            date: getFormattedDateTime(nextExecutionTime),
          },
        })
      }
    >
      {children}
    </EuiToolTip>
  );
}
