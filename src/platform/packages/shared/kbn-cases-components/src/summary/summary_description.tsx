/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface SummaryDescriptionProps {
  date: string;
  time: string;
}

export const SummaryDescription: React.FC<SummaryDescriptionProps> = ({ date, time }) => {
  return (
    <EuiText size="xs" css={({ euiTheme }) => ({ color: euiTheme.colors.textSubdued })}>
      <FormattedMessage
        id="cases.caseSummary.description"
        defaultMessage="Generated on {date} at {time}"
        values={{ date, time }}
      />
    </EuiText>
  );
};

SummaryDescription.displayName = 'CaseSummaryDescription';
