/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { StatusTable } from './status_table';
import { FormattedStatus, getHighestStatus } from '../lib';
import { StatusBadge } from './status_badge';

interface StatusSectionProps {
  id: string;
  title: string;
  statuses: FormattedStatus[];
}

export const StatusSection: FC<StatusSectionProps> = ({ id, title, statuses }) => {
  const highestStatus = useMemo(() => getHighestStatus(statuses), [statuses]);

  return (
    <EuiPageContent grow={false}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatusBadge status={highestStatus} data-test-subj={`${id}SectionStatusBadge`} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <StatusTable statuses={statuses} />
    </EuiPageContent>
  );
};
