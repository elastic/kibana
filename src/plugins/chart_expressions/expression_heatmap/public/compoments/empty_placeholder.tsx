/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const EmptyPlaceholder = (props: { icon: IconType }) => (
  <>
    <EuiText className="heatmap-chart__empty" textAlign="center" color="subdued" size="xs">
      <EuiIcon type={props.icon} color="subdued" size="l" />
      <EuiSpacer size="s" />
      <p>
        <FormattedMessage id="expressionHeatmap.noDataLabel" defaultMessage="No results found" />
      </p>
    </EuiText>
  </>
);
