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

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiHorizontalRule } from '@elastic/eui';

import { IBasePath } from '../../http';
import { IS_IE, URL_MAX_LENGTH } from './url_overflow';

export const UrlOverflowUi: React.FC<{ basePath: IBasePath }> = ({ basePath }) => {
  return (
    <React.Fragment>
      <EuiText>
        <p>
          <FormattedMessage
            id="core.ui.errorUrlOverflow.errorDescription"
            defaultMessage="That's a big URL you have there. I have some unfortunate news: Your browser doesn't play nice
    with Kibana's bacon-double-cheese-burger-with-extra-fries sized URL. To keep you from running
    into problems Kibana limits URLs in your browser to {urlCharacterLimit} characters for your
    safety."
            values={{ urlCharacterLimit: URL_MAX_LENGTH }}
          />
        </p>
      </EuiText>

      <EuiHorizontalRule size="half" />

      <EuiText textAlign="left">
        <h3>
          <FormattedMessage
            id="core.ui.errorUrlOverflow.howTofixErrorTitle"
            defaultMessage="Ok, how do I fix this?"
          />
        </h3>

        <p>
          <FormattedMessage
            id="core.ui.errorUrlOverflow.howTofixErrorDescription"
            defaultMessage="This usually only happens with big, complex dashboards, so you have some options:"
          />
        </p>

        <ol>
          <li>
            <FormattedMessage
              id="core.ui.errorUrlOverflow.howTofixError.enableOptionText"
              defaultMessage="Enable the {storeInSessionStorageConfig} option in the {kibanaSettingsLink}. This will prevent the URLs from
      getting long, but makes them a bit less portable."
              values={{
                storeInSessionStorageConfig: <code>state:storeInSessionStorage</code>,
                kibanaSettingsLink: (
                  <a href={basePath.prepend('/app/management/kibana/settings')}>
                    <FormattedMessage
                      id="core.ui.errorUrlOverflow.howTofixError.enableOptionText.advancedSettingsLinkText"
                      defaultMessage="advanced settings"
                    />
                  </a>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="core.ui.errorUrlOverflow.howTofixError.removeStuffFromDashboardText"
              defaultMessage="Remove some stuff from your dashboard. This will reduce the length of the URL and keep your browser in a good place."
            />
          </li>
          {IS_IE && (
            <li>
              <FormattedMessage
                id="core.ui.errorUrlOverflow.howTofixError.doNotUseIEText"
                defaultMessage="Don't use IE. Every other supported browser we know of doesn't have this limit."
              />
            </li>
          )}
        </ol>
      </EuiText>
    </React.Fragment>
  );
};
