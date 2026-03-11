/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { METRIC_TYPE_DESCRIPTIONS } from '../../common/constants';

interface MetricTypeBadgeProps {
  instrument: string;
}

export const MetricTypeBadge = ({ instrument }: MetricTypeBadgeProps) => {
  const tooltipDescription = METRIC_TYPE_DESCRIPTIONS[instrument];

  if (!tooltipDescription) {
    return <EuiBadge>{instrument}</EuiBadge>;
  }

  return (
    <EuiToolTip content={tooltipDescription}>
      <EuiBadge
        tabIndex={0}
        title=""
        css={css`
          cursor: pointer;
        `}
      >
        {instrument}
      </EuiBadge>
    </EuiToolTip>
  );
};
