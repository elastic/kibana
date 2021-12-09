/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
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
