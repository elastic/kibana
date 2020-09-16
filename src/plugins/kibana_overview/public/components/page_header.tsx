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

import React, { FC } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Capabilities } from 'kibana/public';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  capabilities: Capabilities;
}

export const PageHeader: FC<Props> = ({ capabilities }) => {
  const { navLinks } = capabilities;
  const showStackManagement = navLinks.management;
  const showDevTools = navLinks.dev_tools;

  return (
    <header className="kbnOverviewHeader">
      <div className="kbnOverviewHeader__inner">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon size="xxl" type="logoKibana" />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle size="m">
                  <h1 id="kbnOverviewHeader__title">
                    <FormattedMessage defaultMessage="Kibana" id="kibana.overview.header.title" />
                  </h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup className="kbnOverviewHeader__actions" responsive={false} wrap>
              <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
                <EuiButtonEmpty
                  onClick={createAppNavigationHandler('/app/management')}
                  iconType="indexOpen"
                >
                  {i18n.translate('kibana.overview.header.addDataButtonLabel', {
                    defaultMessage: 'Add data',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>

              {showStackManagement ? (
                <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
                  <EuiButtonEmpty
                    iconType="gear"
                    onClick={createAppNavigationHandler('/app/management')}
                  >
                    {i18n.translate('kibana.overview.header.stackManagementButtonLabel', {
                      defaultMessage: 'Manage',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}

              {showDevTools ? (
                <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
                  <EuiButtonEmpty
                    iconType="wrench"
                    onClick={createAppNavigationHandler('/app/dev_tools#/console')}
                  >
                    {i18n.translate('kibana.overview.header.devToolsButtonLabel', {
                      defaultMessage: 'Dev tools',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </header>
  );
};
