/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const InspectFlyoutHeader = () => (
  <EuiFlyoutHeader hasBorder data-test-subj="inspectFlyoutHeader">
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="kbnInspectComponent.inspectFlyout.title"
          defaultMessage="Inspect component"
        />
      </h2>
    </EuiTitle>
  </EuiFlyoutHeader>
);
