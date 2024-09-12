/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const FilterBadgeInvalidPlaceholder = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge iconType="unlink" color={euiTheme.colors.lightestShade}>
      <FormattedMessage
        id="unifiedSearch.filter.filterBadgeInvalidPlaceholder.label"
        defaultMessage="filter value is invalid or incomplete"
      />
    </EuiBadge>
  );
};
