/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const PageTitle = () => {
  return (
    <EuiText>
      <h1 data-test-subj="managementSettingsTitle">
        <FormattedMessage id="advancedSettings.pageTitle" defaultMessage="Settings" />
      </h1>
    </EuiText>
  );
};
