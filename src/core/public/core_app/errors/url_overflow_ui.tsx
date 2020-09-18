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
import { EuiText } from '@elastic/eui';

import { IBasePath } from '../../http';
import { IS_IE } from './url_overflow';

export const UrlOverflowUi: React.FC<{ basePath: IBasePath }> = ({ basePath }) => {
  return (
    <EuiText textAlign="left">
      <p>
        <FormattedMessage
          id="core.ui.errorUrlOverflow.optionsToFixErrorDescription"
          defaultMessage="Things to try:"
        />
      </p>

      <ul>
        <li>
          <FormattedMessage
            id="core.ui.errorUrlOverflow.optionsToFixError.enableOptionText"
            defaultMessage="Enable the {storeInSessionStorageConfig} option in {kibanaSettingsLink}."
            values={{
              storeInSessionStorageConfig: <code>state:storeInSessionStorage</code>,
              kibanaSettingsLink: (
                <a href={basePath.prepend('/app/management/kibana/settings')}>
                  <FormattedMessage
                    id="core.ui.errorUrlOverflow.optionsToFixError.enableOptionText.advancedSettingsLinkText"
                    defaultMessage="Advanced Settings"
                  />
                </a>
              ),
            }}
          />
        </li>
        <li>
          <FormattedMessage
            id="core.ui.errorUrlOverflow.optionsToFixError.removeStuffFromDashboardText"
            defaultMessage="Simplify the object you are editing by removing content or filters."
          />
        </li>
        {IS_IE && (
          <li>
            <FormattedMessage
              id="core.ui.errorUrlOverflow.optionsToFixError.doNotUseIEText"
              defaultMessage="Upgrade to a modern browser. Every other supported browser we know of doesn't have this limit."
            />
          </li>
        )}
      </ul>
    </EuiText>
  );
};
