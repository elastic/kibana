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

import React, { FunctionComponent } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { HOME_APP_BASE_PATH } from '../../../../common/constants';
import { getServices } from '../../kibana_services';
import { createAppNavigationHandler } from '../app_navigation_handler';

interface Props {
  defaultRoute?: string;
}

export const ChangeHomeRoute: FunctionComponent<Props> = ({ defaultRoute }) => {
  const { uiSettings } = getServices();
  const changeDefaultRoute = () => uiSettings.set('defaultRoute', defaultRoute);

  return (
    <EuiFlexGroup
      className="homPageFooter"
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={1}>
        <EuiFlexGroup
          className="homPageFooter__mainAction"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="home.changeHomeRouteText"
                  defaultMessage="Would you prefer an alternate landing page? "
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="home"
              // onClick={changeDefaultRoute}
              onClick={createAppNavigationHandler('/app/management/kibana/settings#defaultRoute')}
              size="xs"
            >
              <FormattedMessage
                id="home.changeHomeRouteLink"
                defaultMessage="Change the landing page for this space"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {/* TODO: Hook up link to app directory */}
        <EuiButtonEmpty href={''} size="xs" flush="right" iconType="apps">
          <FormattedMessage
            id="home.appDirectory.appDirectoryButtonLabel"
            defaultMessage="View app directory"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ChangeHomeRoute.defaultProps = {
  defaultRoute: HOME_APP_BASE_PATH,
};
