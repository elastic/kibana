/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CSSObject } from '@emotion/react';
import { LogLevelBadge } from '@kbn/discover-utils';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';

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
        fallback={<span data-test-subj={`${dataTestSubj}-unknown`}>{value}</span>}
        data-test-subj={dataTestSubj}
        css={badgeCss}
      />
    );
  };
