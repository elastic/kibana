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

import {
  EuiHorizontalRule,
  EuiIcon,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface ManagementLandingPageProps {
  version: string;
  setBreadcrumbs: () => void;
}

export const ManagementLandingPage = ({ version, setBreadcrumbs }: ManagementLandingPageProps) => {
  setBreadcrumbs();

  return (
    <EuiPageContent horizontalPosition="center" data-test-subj="managementHome">
      <div>
        <div className="eui-textCenter">
          <EuiIcon type="managementApp" size="xxl" />
          <EuiSpacer />
          <EuiTitle>
            <h1>
              <FormattedMessage
                id="management.landing.header"
                defaultMessage="Welcome to Stack Management {version}"
                values={{ version }}
              />
            </h1>
          </EuiTitle>
          <EuiText>
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, index patterns, saved objects, Kibana settings, and more."
            />
          </EuiText>
        </div>

        <EuiHorizontalRule />

        <EuiText color="subdued" size="s" textAlign="center">
          <p>
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A complete list of apps is in the menu on the left."
            />
          </p>
        </EuiText>
      </div>
    </EuiPageContent>
  );
};
