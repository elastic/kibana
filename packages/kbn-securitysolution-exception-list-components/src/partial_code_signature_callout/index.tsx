/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut } from '@elastic/eui';

export const PartialCodeSignatureCallout = () => {
  return (
    <EuiCallOut
      title={i18n.translate('exceptionList-components.partialCodeSignatureCallout.title', {
        defaultMessage: 'Please review your entries',
      })}
      iconType="warning"
      color="warning"
      size="s"
      data-test-subj="partialCodeSignatureCallout"
    >
      <FormattedMessage
        id="exceptionList-components.partialCodeSignatureCallout.body"
        defaultMessage='Please review field values, as your filter criteria may be incomplete. We recommend both the signer name and trust status be included (using the "AND" operator) to avoid potential security gaps.'
        tagName="p"
      />
    </EuiCallOut>
  );
};
