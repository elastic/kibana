/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme, IconType, EuiIcon } from '@elastic/eui';
import { AgentName, isRumAgentName } from '@kbn/elastic-agent-utils';
import { css } from '@emotion/react';

export const TransactionNameIcon = (agentName: AgentName) => {
  const { euiTheme } = useEuiTheme();
  const icon: IconType = isRumAgentName(agentName) ? 'globe' : 'merge';
  return (
    <EuiIcon
      data-test-subj="discoverContextualComponentsSummaryColumnTransactionNameIcon"
      type={icon}
      size="s"
      css={css`
        margin-right: ${euiTheme.size.xs};
      `}
    />
  );
};
