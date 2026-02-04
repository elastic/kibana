/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const SessionInfoDisclaimer = () => (
  <>
    <EuiSpacer size="l" />
    <EuiText size="s" color="subdued" data-test-subj="feedbackSessionInfoDisclaimer">
      <FormattedMessage
        id="feedback.form.sessionInfo.description"
        defaultMessage="Your session information is included along with your input and email. If you need assistance, <supportLink>submit a support request</supportLink> instead."
        values={{
          supportLink: (linkText) => (
            <EuiLink href="https://support.elastic.co" target="_blank">
              {linkText}
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  </>
);
