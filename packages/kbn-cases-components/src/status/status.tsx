/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiBadge } from '@elastic/eui';

import { getStatusConfiguration } from './config';
import { CaseStatuses } from './types';

interface Props {
  status: CaseStatuses;
  dataTestSubj?: string;
}

const statuses = getStatusConfiguration();

const CaseStatusComponent: React.FC<Props> = ({ status, dataTestSubj }) => {
  return (
    <EuiBadge
      data-test-subj={dataTestSubj ? dataTestSubj : `case-status-badge-${status}`}
      color={statuses[status]?.color}
    >
      {statuses[status]?.label}
    </EuiBadge>
  );
};

CaseStatusComponent.displayName = 'Status';

export const Status = memo(CaseStatusComponent);
