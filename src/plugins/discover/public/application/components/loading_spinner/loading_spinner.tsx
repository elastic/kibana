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
import { EuiLoadingSpinner, EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

export function LoadingSpinner() {
  return (
    <I18nProvider>
      <>
        <EuiTitle size="s" data-test-subj="loadingSpinnerText">
          <h2>
            <FormattedMessage id="discover.searchingTitle" defaultMessage="Searching" />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiLoadingSpinner size="l" data-test-subj="loadingSpinner" />
      </>
    </I18nProvider>
  );
}

export function createLoadingSpinnerDirective(reactDirective: any) {
  return reactDirective(LoadingSpinner);
}
