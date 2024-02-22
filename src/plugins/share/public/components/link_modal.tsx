/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiFormHelpText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface LinkProps {
  objectType: string;
}

export const LinkModal = ({ objectType }: LinkProps) => {
  return (
    <EuiForm>
      <EuiSpacer size="s" />
      <EuiFormHelpText>
        <FormattedMessage
          id="share.link.helpText"
          defaultMessage="Share a direct link to this {objectType}."
          values={{ objectType }}
        />
      </EuiFormHelpText>
      <EuiSpacer />
    </EuiForm>
  );
};
