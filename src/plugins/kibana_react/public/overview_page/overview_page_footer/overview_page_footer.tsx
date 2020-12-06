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

import React, { FC, MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { RedirectAppLinks } from '../../app_links';
import { useKibana } from '../../context';
import { useUiSetting$ } from '../../ui_settings';

interface Props {
  addBasePath: (path: string) => string;
  /** The path to set as the new default route in advanced settings */
  path: string;
  /** Callback function to invoke when the user wants to set their default route to the current page */
  onSetDefaultRoute?: (event: MouseEvent) => void;
  /** Callback function to invoke when the user wants to change their default route button is changed */
  onChangeDefaultRoute?: (event: MouseEvent) => void;
}

export const OverviewPageFooter: FC<Props> = ({
  addBasePath,
  path,
  onSetDefaultRoute,
  onChangeDefaultRoute,
}) => {
  const [defaultRoute, setDefaultRoute] = useUiSetting$<string>('defaultRoute');
  const {
    services: {
      application,
      notifications: { toasts },
    },
  } = useKibana<CoreStart>();

  const { show, save } = application.capabilities.advancedSettings;
  const isAdvancedSettingsEnabled = show && save;

  const defaultRoutebutton = defaultRoute.includes(path) ? (
    <RedirectAppLinks application={application}>
      <EuiButtonEmpty
        className="kbnOverviewPageFooter__button"
        flush="both"
        iconType="home"
        size="xs"
        onClick={(event: MouseEvent) => {
          application.navigateToUrl(addBasePath('/app/management/kibana/settings#defaultRoute'));
          if (onChangeDefaultRoute) {
            onChangeDefaultRoute(event);
          }
        }}
      >
        <FormattedMessage
          id="kibana-react.pageFooter.changeHomeRouteLink"
          defaultMessage="Display a different page on log in"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  ) : (
    <EuiButtonEmpty
      className="kbnOverviewPageFooter__button"
      flush="both"
      iconType="home"
      onClick={(event: MouseEvent) => {
        setDefaultRoute(path);
        toasts.addSuccess({
          title: i18n.translate('kibana-react.pageFooter.changeDefaultRouteSuccessToast', {
            defaultMessage: 'Landing page updated',
          }),
        });
        if (onSetDefaultRoute) {
          onSetDefaultRoute(event);
        }
      }}
      size="xs"
    >
      <FormattedMessage
        id="kibana-react.pageFooter.makeDefaultRouteLink"
        defaultMessage="Make this my landing page"
      />
    </EuiButtonEmpty>
  );

  return (
    <footer className="kbnOverviewPageFooter">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <div>{isAdvancedSettingsEnabled ? defaultRoutebutton : null}</div>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <div>
            <RedirectAppLinks application={application}>
              <EuiButtonEmpty
                className="kbnOverviewPageFooter__button"
                data-test-subj="allPlugins"
                flush="both"
                href={addBasePath('/app/home#/feature_directory')}
                iconType="apps"
                size="xs"
              >
                <FormattedMessage
                  id="kibana-react.pageFooter.appDirectoryButtonLabel"
                  defaultMessage="View app directory"
                />
              </EuiButtonEmpty>
            </RedirectAppLinks>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </footer>
  );
};
