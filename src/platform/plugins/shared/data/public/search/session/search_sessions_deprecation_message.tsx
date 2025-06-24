/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';

const searchSessionsDeprecatedWarningTitle = i18n.translate(
  'data.searchSessionIndicator.deprecationWarning.title',
  {
    defaultMessage: 'Deprecated in 8.15.0',
  }
);

export interface SearchSessionsDeprecatedWarningProps {
  size?: 's' | 'm';
}

export const SearchSessionsDeprecatedWarning = ({
  size = 'm',
}: SearchSessionsDeprecatedWarningProps) => (
  <EuiCallOut
    title={searchSessionsDeprecatedWarningTitle}
    size={size}
    color="warning"
    iconType="help"
    data-test-subj="searchSessionsDeprecatedWarningTitle"
  >
    <FormattedMessage
      id="data.searchSessionIndicator.deprecationWarning.textParagraphOne"
      defaultMessage="Search Sessions are deprecated and will be removed in a future version."
    />
  </EuiCallOut>
);
