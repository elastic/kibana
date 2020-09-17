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
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import { SearchTimeoutError, TimeoutErrorMode } from './errors';

export const getTimeoutErrorMessage = (application: ApplicationStart, e: SearchTimeoutError) => {
  function getMessage() {
    switch (e.mode) {
      case TimeoutErrorMode.UPGRADE:
        return i18n.translate('data.search.upgradeLicense', {
          defaultMessage:
            'One or more queries timed out. With our free Basic tier, your queries never time out.',
        });
      case TimeoutErrorMode.CONTACT:
        return i18n.translate('xpack.data.search.timeoutContactAdmin', {
          defaultMessage:
            'One or more queries timed out. Contact your system administrator to increase the run time.',
        });
      case TimeoutErrorMode.CHANGE:
        return i18n.translate('xpack.data.search.timeoutIncreaseSetting', {
          defaultMessage:
            'One or more queries timed out. Increase run time with the search timeout advanced setting.',
        });
    }
  }

  function getActionText() {
    switch (e.mode) {
      case TimeoutErrorMode.UPGRADE:
        return i18n.translate('data.search.upgradeLicenseActionText', {
          defaultMessage: 'Upgrade',
        });
        break;
      case TimeoutErrorMode.CHANGE:
        return i18n.translate('data.search.timeoutIncreaseSettingActionText', {
          defaultMessage: 'Go to Advanced Settings',
        });
        break;
    }
  }

  function onClick() {
    switch (e.mode) {
      case TimeoutErrorMode.UPGRADE:
        application.navigateToApp('management', {
          path: `/kibana/indexPatterns`,
        });
        break;
      case TimeoutErrorMode.CHANGE:
        application.navigateToApp('management', {
          path: `/kibana/settings`,
        });
        break;
    }
  }

  const actionText = getActionText();
  return (
    <>
      {getMessage()}
      {actionText && (
        <>
          <EuiSpacer size="s" />
          <div className="eui-textRight">
            <EuiButton color="danger" onClick={onClick} size="s">
              {actionText}
            </EuiButton>
          </div>
        </>
      )}
    </>
  );
};
