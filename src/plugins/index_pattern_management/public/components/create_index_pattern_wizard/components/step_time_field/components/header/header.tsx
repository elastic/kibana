/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

interface HeaderProps {
  indexPattern: string;
  indexPatternName: string;
}

export const Header: React.FC<HeaderProps> = ({ indexPattern, indexPatternName }) => (
  <div>
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepTimeHeader"
          defaultMessage="Step 2 of 2: Configure settings"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiText>
      <FormattedMessage
        id="indexPatternManagement.createIndexPattern.stepTimeLabel"
        defaultMessage="Specify settings for your {indexPattern} {indexPatternName}."
        values={{
          indexPattern: <strong>{indexPattern}</strong>,
          indexPatternName,
        }}
      />
    </EuiText>
  </div>
);
