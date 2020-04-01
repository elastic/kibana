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
  EuiText,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { CreateAlert } from './create_alert';
import { AlertingExampleComponentParams } from '../application';

export const DocumentationPage = (deps: AlertingExampleComponentParams) => (
  <EuiPageBody>
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to the Alerting plugin example</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Documentation links</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <h2>Plugin Structure</h2>
          <p>
            This example solution has both `server` and a `public` plugins. The `server` handles
            registration of example the AlertTypes, while the `public` handles creation of, and
            navigation for, these alert types.
          </p>
        </EuiText>
        <EuiSpacer />
        <CreateAlert {...deps} />
      </EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);
