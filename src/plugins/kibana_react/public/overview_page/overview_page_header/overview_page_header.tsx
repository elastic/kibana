/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import { RedirectAppLinks } from '../../app_links';
import { useKibana } from '../../context';

import './index.scss';

interface Props {
  hideToolbar?: boolean;
  iconType?: IconType;
  overlap?: boolean;
  showDevToolsLink?: boolean;
  showManagementLink?: boolean;
  title: JSX.Element | string;
  addBasePath: (path: string) => string;
}

export const OverviewPageHeader: FC<Props> = ({
  hideToolbar,
  iconType,
  overlap,
  showDevToolsLink,
  showManagementLink,
  title,
  addBasePath,
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
      className={`kbnOverviewPageHeader ${
        overlap ? 'kbnOverviewPageHeader--hasOverlap' : 'kbnOverviewPageHeader--noOverlap'
      }`}
    >
      <div className="kbnOverviewPageHeader__inner">
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
                  <h1 id="kbnOverviewPageHeader__title">{title}</h1>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          {!hideToolbar && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup className="kbnOverviewPageHeader__actions" responsive={false} wrap>
                <EuiFlexItem className="kbnOverviewPageHeader__actionItem" grow={false}>
                  <RedirectAppLinks application={application}>
                    <EuiButtonEmpty
                      className="kbnOverviewPageHeader__actionButton"
                      flush="both"
                      href={addBasePath('/app/home#/tutorial_directory')}
                      iconType="indexOpen"
                    >
                      {i18n.translate('kibana-react.kbnOverviewPageHeader.addDataButtonLabel', {
                        defaultMessage: 'Add data',
                      })}
                    </EuiButtonEmpty>
                  </RedirectAppLinks>
                </EuiFlexItem>

                {showManagementLink && isManagementEnabled ? (
                  <EuiFlexItem className="kbnOverviewPageHeader__actionItem" grow={false}>
                    <RedirectAppLinks application={application}>
                      <EuiButtonEmpty
                        className="kbnOverviewPageHeader__actionButton"
                        flush="both"
                        iconType="gear"
                        href={addBasePath('/app/management')}
                      >
                        {i18n.translate(
                          'kibana-react.kbnOverviewPageHeader.stackManagementButtonLabel',
                          {
                            defaultMessage: 'Manage',
                          }
                        )}
                      </EuiButtonEmpty>
                    </RedirectAppLinks>
                  </EuiFlexItem>
                ) : null}

                {showDevToolsLink && isDevToolsEnabled ? (
                  <EuiFlexItem className="kbnOverviewPageHeader__actionItem" grow={false}>
                    <RedirectAppLinks application={application}>
                      <EuiButtonEmpty
                        className="kbnOverviewPageHeader__actionButton"
                        flush="both"
                        iconType="wrench"
                        href={addBasePath('/app/dev_tools#/console')}
                      >
                        {i18n.translate('kibana-react.kbnOverviewPageHeader.devToolsButtonLabel', {
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
