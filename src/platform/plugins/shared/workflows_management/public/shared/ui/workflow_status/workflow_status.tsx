/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, type EuiBadgeProps } from '@elastic/eui';

type WorkflowStatusProps = EuiBadgeProps & {
  valid: boolean;
  showLabel?: boolean;
};

export function WorkflowStatus({ valid, showLabel = true, ...props }: WorkflowStatusProps) {
  return (
    <EuiBadge
      color={valid ? 'hollow' : 'warning'}
      iconType={valid ? 'check' : 'warning'}
      {...props}
    >
      {showLabel && (
        <>
          {valid ? (
            <FormattedMessage id="workflows.workflowList.valid" defaultMessage="Valid" />
          ) : (
            <FormattedMessage id="workflows.workflowList.invalid" defaultMessage="Has issues" />
          )}
        </>
      )}
    </EuiBadge>
  );
}
