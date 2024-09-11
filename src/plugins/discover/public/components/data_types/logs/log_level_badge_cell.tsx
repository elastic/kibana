/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { LogLevelBadge } from '@kbn/discover-utils';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import { EuiFlexGroup } from '@elastic/eui';

const dataTestSubj = 'logLevelBadgeCell';

export const getLogLevelBadgeCell =
  (logLevelField: string) => (props: DataGridCellValueElementProps) => {
    const value = props.row.flattened[logLevelField];

    if (!value) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    return (
      <EuiFlexGroup alignItems="center" css={{ height: '100%' }}>
        <LogLevelBadge
          logLevel={value}
          fallback={<span data-test-subj={`${dataTestSubj}-unknown`}>{value}</span>}
          data-test-subj={dataTestSubj}
        />
      </EuiFlexGroup>
    );
  };
