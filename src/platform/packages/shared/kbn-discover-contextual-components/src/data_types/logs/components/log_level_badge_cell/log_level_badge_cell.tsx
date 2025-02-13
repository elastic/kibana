/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSObject } from '@emotion/react';
import React from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table/src/types';
import { LogLevelBadge } from '@kbn/discover-utils';

const dataTestSubj = 'logLevelBadgeCell';
const badgeCss: CSSObject = { marginTop: '-4px' };

export const getLogLevelBadgeCell =
  (logLevelField: string) => (props: DataGridCellValueElementProps) => {
    const value = props.row.flattened[logLevelField];

    if (!value) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    return (
      <LogLevelBadge
        logLevel={value}
        fallback={<span data-test-subj={`${dataTestSubj}-unknown`}>{value as string}</span>}
        data-test-subj={dataTestSubj}
        css={badgeCss}
      />
    );
  };

export type LogLevelBadgeCell = ReturnType<typeof getLogLevelBadgeCell>;
