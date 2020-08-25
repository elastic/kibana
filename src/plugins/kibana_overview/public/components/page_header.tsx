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
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  title: JSX.Element;
}

export const PageHeader: FC<Props> = ({ title }) => {
  const devTools = { path: '/app/dev_tools#/console' };
  const stackManagement = { path: '/app/management' };

  return (
    <div className="homPageHeaderContainer">
      <header className="homPageHeader">
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem className="homPageHeader__titleWrapper">{title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup className="homPageHeader__menu" alignItems="flexEnd">
              <EuiFlexItem className="homPageHeader__menuItem">
                <EuiButtonEmpty href="#/tutorial_directory" iconType="plusInCircle">
                  {i18n.translate('home.pageHeader.addDataButtonLabel', {
                    defaultMessage: 'Add data',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              {stackManagement ? (
                <EuiFlexItem className="homPageHeader__menuItem">
                  <EuiButtonEmpty
                    onClick={createAppNavigationHandler(stackManagement.path)}
                    iconType="gear"
                  >
                    {i18n.translate('home.pageHeader.stackManagementButtonLabel', {
                      defaultMessage: 'Manage',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
              {devTools ? (
                <EuiFlexItem className="homPageHeader__menuItem">
                  <EuiButtonEmpty
                    onClick={createAppNavigationHandler(devTools.path)}
                    iconType="wrench"
                  >
                    {i18n.translate('home.pageHeader.devToolsButtonLabel', {
                      defaultMessage: 'Dev tools',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </header>
    </div>
  );
};
