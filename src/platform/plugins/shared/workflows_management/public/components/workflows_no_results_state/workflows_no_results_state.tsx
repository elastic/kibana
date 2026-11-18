/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

interface WorkflowsNoResultsStateProps {
  onClear: () => void;
}

export function WorkflowsNoResultsState({ onClear }: WorkflowsNoResultsStateProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <FormattedMessage
      id="workflows.noResults.message"
      defaultMessage="No results match your search and filters. {clearAll}"
      values={{
        clearAll: (
          <EuiLink
            color="text"
            onClick={onClear}
            data-test-subj="workflows-no-results-clear"
            css={css`
              &:hover,
              &:focus {
                color: ${euiTheme.colors.textPrimary};
                text-decoration: underline;
              }
            `}
          >
            <FormattedMessage id="workflows.noResults.clearAll" defaultMessage="Clear all" />
          </EuiLink>
        ),
      }}
    />
  );
}
