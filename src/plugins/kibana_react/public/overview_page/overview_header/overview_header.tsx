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
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { RedirectAppLinks, useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Props {
  title: JSX.Element;
}

export const OverviewHeader: FC<Props> = ({ title }) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  const { management: showManagement, dev_tools: showDevtools } = application.capabilities.navLinks;

  return (
    <EuiFlexGroup>
      <EuiFlexItem>{title}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup className="kbnOverviewHeader__actions" responsive={false} wrap>
          <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
            <RedirectAppLinks application={application}>
              <EuiButtonEmpty href={'/app/home#/tutorial_directory'} iconType="indexOpen">
                {i18n.translate('kibana-react.overviewHeader.addDataButtonLabel', {
                  defaultMessage: 'Add data',
                })}
              </EuiButtonEmpty>
            </RedirectAppLinks>
          </EuiFlexItem>

          {showManagement ? (
            <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
              <RedirectAppLinks application={application}>
                <EuiButtonEmpty iconType="gear" href={'/app/management'}>
                  {i18n.translate('kibana-react.overviewHeader.stackManagementButtonLabel', {
                    defaultMessage: 'Manage',
                  })}
                </EuiButtonEmpty>
              </RedirectAppLinks>
            </EuiFlexItem>
          ) : null}

          {showDevtools ? (
            <EuiFlexItem className="kbnOverviewHeader__actionItem" grow={false}>
              <RedirectAppLinks application={application}>
                <EuiButtonEmpty iconType="wrench" href={'/app/dev_tools#/console'}>
                  {i18n.translate('kibana-react.overviewHeader.devToolsButtonLabel', {
                    defaultMessage: 'Dev tools',
                  })}
                </EuiButtonEmpty>
              </RedirectAppLinks>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
