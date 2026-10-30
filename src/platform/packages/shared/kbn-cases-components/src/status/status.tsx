/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';

import { getStatusConfiguration } from './config';
import type { CaseStatuses } from './types';

interface Props {
  status: CaseStatuses;
  /** Overrides the label of the status category, e.g. with an admin-defined status name. */
  label?: string;
  /** Overrides the color of the status category. */
  color?: EuiBadgeProps['color'];
  dataTestSubj?: string;
}

const statuses = getStatusConfiguration();

const CaseStatusComponent: React.FC<Props> = ({ status, label, color, dataTestSubj }) => {
  return (
    <EuiBadge
      data-test-subj={dataTestSubj ? dataTestSubj : `case-status-badge-${status}`}
      color={color ?? statuses[status]?.color}
    >
      {label ?? statuses[status]?.label}
    </EuiBadge>
  );
};

CaseStatusComponent.displayName = 'Status';

export const Status = memo(CaseStatusComponent);
