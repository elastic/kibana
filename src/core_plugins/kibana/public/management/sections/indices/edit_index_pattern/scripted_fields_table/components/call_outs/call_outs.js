/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

export const CallOutsComponent = ({
  deprecatedLangsInUse,
  painlessDocLink,
  intl
}) => {
  if (!deprecatedLangsInUse.length) {
    return null;
  }

  return (
    <div>
      <EuiCallOut
        title={intl.formatMessage({
          id: 'kbn.management.editIndexPattern.scripted.deprecationLangHeader', defaultMessage: 'Deprecation languages in use'
        })}
        color="danger"
        iconType="cross"
      >
        <p>
          <FormattedMessage
            id="kbn.management.editIndexPattern.scripted.deprecationLangLabel.deprecationLangDetail"
            defaultMessage="The following deprecated languages are in use: {deprecatedLangsInUse}. Support for these languages will be
            removed in the next major version of Kibana and Elasticsearch. Convert you scripted fields to {link} to avoid any problems."
            values={{
              deprecatedLangsInUse: deprecatedLangsInUse.join(', '),
              link: (
                <EuiLink href={painlessDocLink}>
                  Painless
                </EuiLink>)
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m"/>
    </div>
  );
};

export const CallOuts = injectI18n(CallOutsComponent);
