/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut } from '@elastic/eui';

interface WildCardWithWrongOperatorWarningProps {
  index?: string;
}
export const WildCardWithWrongOperatorCallout: FC<WildCardWithWrongOperatorWarningProps> = ({
  index,
}) => {
  return (
    <EuiCallOut
      title={i18n.translate(
        'xpack.lists.exceptions.wildcardWithWrongOperatorWarning.callout.title',
        { defaultMessage: 'Ineffective entry' }
      )}
      iconType="warning"
      color="warning"
      size="s"
    >
      <p>
        <FormattedMessage
          id="xpack.lists.exceptions.wildcardWithWrongOperatorWarning.callout.body"
          defaultMessage="{entry_index} Using a '*' or a '?' at the end of the value and using the 'IS' operator can make the entry ineffective. Change the {operator} to '{matches}' to ensure wildcards run properly."
          values={{
            entry_index: index ? `[${index}] ` : '',
            operator: <strong>operator</strong>,
            matches: <strong>matches</strong>,
          }}
        />
      </p>
    </EuiCallOut>
  );
};
