/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut } from '@elastic/eui';

export const WildCardWithWrongOperatorCallout = () => {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.lists.exceptions.wildcardWithWrongOperatorWarning.callout.title',
        { defaultMessage: 'Please review your entries' }
      )}
      iconType="warning"
      color="warning"
      size="s"
    >
      <p>
        <FormattedMessage
          id="xpack.lists.exceptions.wildcardWithWrongOperatorWarning.callout.body"
          defaultMessage="Using a '*' or a '?' in the value with the 'IS' operator can make the entry ineffective. {operator} to '{matches}' to ensure wildcards run properly."
          values={{
            operator: <strong>Change the operator</strong>,
            matches: <strong>matches</strong>,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
