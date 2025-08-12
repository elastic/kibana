/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/apm-types-shared';

interface Props {
  eventType: ProcessorEvent.transaction | ProcessorEvent.span;
  totalDocCount?: number;
}

export function TotalDocCountLabel({ eventType, totalDocCount }: Props) {
  const { euiTheme } = useEuiTheme();

  if (!totalDocCount) {
    return null;
  }

  return (
    <EuiText
      size="s"
      css={css`
        border-left: ${euiTheme.border.thin};
        padding-left: ${euiTheme.size.s};
      `}
    >
      {eventType === ProcessorEvent.transaction
        ? i18n.translate('kbnApmUiShared.durationDistributionChart.totalTransactionsCount', {
            defaultMessage:
              '{totalDocCount} total {totalDocCount, plural, one {transaction} other {transactions}}',
            values: {
              totalDocCount,
            },
          })
        : i18n.translate('kbnApmUiShared.durationDistributionChart.totalSpansCount', {
            defaultMessage:
              '{totalDocCount} total {totalDocCount, plural, one {span} other {spans}}',
            values: {
              totalDocCount,
            },
          })}
    </EuiText>
  );
}
