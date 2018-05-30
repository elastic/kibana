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

import 'ngreact';
import React, { Fragment } from 'react';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';

import './fetch_error.less';

const DiscoverFetchError = ({ fetchError }) => {
  if (!fetchError) {
    return null;
  }

  let body;

  if (fetchError.lang === 'painless') {
    const managementUrl = chrome.getNavLinkById('kibana:management').url;
    const url = `${managementUrl}/kibana/indices`;

    body = (
      <p>
         You can address this error by editing the &lsquo;{fetchError.script}&rsquo; field
         in <a href={url}>Management &gt; Index Patterns</a>,
         under the &ldquo;Scripted fields&rdquo; tab.
      </p>
    );
  }

  return (
    <Fragment>
      <EuiSpacer size="xl" />

      <EuiFlexGroup justifyContent="center" data-test-subj="discoverFetchError">
        <EuiFlexItem grow={false} className="discoverFetchError">
          <EuiCallOut
            title={fetchError.message}
            color="danger"
            iconType="cross"
          >
            {body}

            <EuiCodeBlock>
              {fetchError.error}
            </EuiCodeBlock>
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
    </Fragment>
  );
};

const app = uiModules.get('apps/discover', ['react']);

app.directive('discoverFetchError', reactDirective => reactDirective(DiscoverFetchError));
