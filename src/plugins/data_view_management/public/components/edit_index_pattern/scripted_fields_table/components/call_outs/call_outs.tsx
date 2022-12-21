/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface CallOutsProps {
  deprecatedLangsInUse: string[];
  painlessDocLink: string;
}

export const CallOuts = ({ deprecatedLangsInUse, painlessDocLink }: CallOutsProps) => {
  if (!deprecatedLangsInUse.length) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.scripted.deprecationLangHeader"
            defaultMessage="Deprecation languages in use"
          />
        }
        color="danger"
        iconType="cross"
      >
        <p>
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.scripted.deprecationLangLabel.deprecationLangDetail"
            defaultMessage="The following deprecated languages are in use: {deprecatedLangsInUse}. Support for these languages will be
            removed in the next major version of Kibana and Elasticsearch. Convert you scripted fields to {link} to avoid any problems."
            values={{
              deprecatedLangsInUse: deprecatedLangsInUse.join(', '),
              link: (
                <EuiLink href={painlessDocLink}>
                  <FormattedMessage
                    id="indexPatternManagement.editIndexPattern.scripted.deprecationLangLabel.painlessDescription"
                    defaultMessage="Painless"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
