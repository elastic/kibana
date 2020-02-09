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
  EuiListGroup,
} from '@elastic/eui';

export const DocumentationPage = () => (
  <EuiPageBody data-test-subj="dataPluginExplorerHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to the data plugin portal!</h1>
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
          <h2>Search Services</h2>
          <ul>
            <li>Provide an abstraction on top of advanced query settings</li>

            <li>
              Providing an abstraction layer for query cancellation semantics allows us to avoid
              wide-spread code changes when ES API changes, allows us to provide a minimum set of
              useful functionality first, and allows us to continue adding more advanced features
              down the road
            </li>

            <li>Provide a clean separation of OSS and commercial search strategies.</li>
          </ul>
          <h2>Extensibility</h2>
          <p>
            Plugins can register or use different client side, and server side{' '}
            <i>search strategies</i>. Search strategies can take advantage of other search stratgies
            already registered. For example, the `DEMO_SEARCH_STRATEGY` uses the
            `ASYNC_SEARCH_STRATEGY` which uses the `SYNC_SEARCH_STRATEGY`
          </p>

          <h2>References</h2>
          <EuiListGroup
            listItems={[
              {
                label: 'Design document',
                href:
                  'https://docs.google.com/document/d/1ROLq29V1TeLux4ASQIJNllRGkv-xa5XIE72gTU6u16Q/edit#heading=h.3aa9ppqzkvdd',
                iconType: 'document',
                size: 's',
              },
              {
                label: 'Roadmap',
                href: 'https://github.com/elastic/kibana/issues/44661',
                iconType: 'logoGithub',
                size: 's',
              },
              {
                label: 'Data access API issue',
                href: 'https://github.com/elastic/kibana/issues/43371',
                iconType: 'logoGithub',
                size: 's',
              },
            ]}
          />
        </EuiText>
      </EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);
