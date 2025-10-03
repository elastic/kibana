/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconTip, type EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

type WorkflowStatusProps = EuiBadgeProps & {
  valid: boolean;
};

export function WorkflowStatus({ valid, ...props }: WorkflowStatusProps) {
  if (valid) return null;
  return (
    <EuiIconTip
      type="errorFilled"
      color="red"
      size="m"
      content={i18n.translate('workflows.workflowList.workflowInvalid', {
        defaultMessage:
          'This workflow can’t be enabled because it contains validation errors. Please review and fix them before continuing.',
      })}
    />
  );
}
