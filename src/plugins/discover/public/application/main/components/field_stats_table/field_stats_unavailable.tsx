/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useEuiTheme, EuiFlexItem } from '@elastic/eui';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

const FIELD_STATS_UNAVAILABLE_TITLE = i18n.translate('discover.fieldStats.unavailableTitle', {
  defaultMessage: 'Field statistics not supported for ES|QL queries',
});

export const FieldStatsUnavailableMessage = ({
  id,
  title = FIELD_STATS_UNAVAILABLE_TITLE,
}: {
  id?: string;
  title?: string;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexItem
      alignItems="center"
      fullWidth
      css={css`
        height: 100%;
      `}
    >
      <EmptyPlaceholder icon={'warning'} message={title} />
    </EuiFlexItem>
  );
};
