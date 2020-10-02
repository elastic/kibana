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
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { RedirectAppLinks, useKibana } from '../../../../../../src/plugins/kibana_react/public';

import './index.scss';

interface Props {
  hideToolbar?: boolean;
  iconType?: IconType;
  overlap?: boolean;
  showDevToolsLink?: boolean;
  showManagementLink?: boolean;
  title: JSX.Element | string;
}

export const PageHeader: FC<Props> = ({
  hideToolbar,
  iconType,
  overlap,
  showDevToolsLink,
  showManagementLink,
  title,
}) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  const {
    management: isManagementEnabled,
    dev_tools: isDevToolsEnabled,
  } = application.capabilities.navLinks;

  return (
    <header
      className={`pageHeader ${overlap ? 'pageHeader--hasOverlap' : 'pageHeader--noOverlap'}`}
    >
      <div className="pageHeader__inner">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" responsive={false}>
              {iconType && (
                <EuiFlexItem grow={false}>
                  <EuiIcon size="xxl" type={iconType} />
                </EuiFlexItem>
              )}

              <EuiFlexItem>
                <EuiTitle size="m">
                  <h1 id="pageHeader__title">{title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {!hideToolbar && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup className="pageHeader__actions" responsive={false} wrap>
                <EuiFlexItem className="pageHeader__actionItem" grow={false}>
                  <RedirectAppLinks application={application}>
                    <EuiButtonEmpty
                      className="pageHeader__actionButton"
                      flush="left"
                      href={'/app/home#/tutorial_directory'}
                      iconType="indexOpen"
                    >
                      {i18n.translate('kibana-react.pageHeader.addDataButtonLabel', {
                        defaultMessage: 'Add data',
                      })}
                    </EuiButtonEmpty>
                  </RedirectAppLinks>
                </EuiFlexItem>

                {showManagementLink && isManagementEnabled ? (
                  <EuiFlexItem className="pageHeader__actionItem" grow={false}>
                    <RedirectAppLinks application={application}>
                      <EuiButtonEmpty
                        className="pageHeader__actionButton"
                        flush="left"
                        iconType="gear"
                        href={'/app/management'}
                      >
                        {i18n.translate('kibana-react.pageHeader.stackManagementButtonLabel', {
                          defaultMessage: 'Manage',
                        })}
                      </EuiButtonEmpty>
                    </RedirectAppLinks>
                  </EuiFlexItem>
                ) : null}

                {showDevToolsLink && isDevToolsEnabled ? (
                  <EuiFlexItem className="pageHeader__actionItem" grow={false}>
                    <RedirectAppLinks application={application}>
                      <EuiButtonEmpty
                        className="pageHeader__actionButton"
                        flush="left"
                        iconType="wrench"
                        href={'/app/dev_tools#/console'}
                      >
                        {i18n.translate('kibana-react.pageHeader.devToolsButtonLabel', {
                          defaultMessage: 'Dev tools',
                        })}
                      </EuiButtonEmpty>
                    </RedirectAppLinks>
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </header>
  );
};
