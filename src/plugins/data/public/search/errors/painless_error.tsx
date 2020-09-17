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
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ApplicationStart } from 'kibana/public';
import { PainlessError } from './errors';

export const getPainlessErrorMessage = (application: ApplicationStart, e: PainlessError) => {
  function onClick() {
    application.navigateToApp('management', {
      path: `/kibana/indexPatterns`,
    });
  }

  return (
    <>
      {e.message}
      <EuiSpacer size="s" />
      <div className="eui-textRight">
        <EuiButton color="danger" onClick={onClick} size="s">
          <FormattedMessage id="data.painlessError.buttonTxt" defaultMessage="Edit script" />
        </EuiButton>
      </div>
    </>
  );
};
