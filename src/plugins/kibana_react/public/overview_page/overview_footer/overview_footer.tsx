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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import {
  RedirectAppLinks,
  useKibana,
  useUiSetting$,
} from '../../../../../../src/plugins/kibana_react/public';

import './index';

interface Props {
  /** The path to set as the new default route in advanced settings */
  path: string;
}

export const OverviewFooter: FC<Props> = ({ path }) => {
  const [defaultRoute, setDefaultRoute] = useUiSetting$<string>('defaultRoute');
  const {
    services: {
      application,
      notifications: { toasts },
    },
  } = useKibana<CoreStart>();

  const { show, save } = application.capabilities.advancedSettings;
  const isAdvancedSettingsEnabled = show && save;

  const defaultRoutebutton =
    defaultRoute === path ? (
      <RedirectAppLinks application={application}>
        <EuiButtonEmpty
          iconType="home"
          href={'/app/management/kibana/settings#defaultRoute'}
          size="xs"
        >
          <FormattedMessage
            id="kibana-react.overviewFooter.changeHomeRouteLink"
            defaultMessage="Display a different page on log in"
          />
        </EuiButtonEmpty>
      </RedirectAppLinks>
    ) : (
      <EuiButtonEmpty
        iconType="home"
        onClick={() => {
          setDefaultRoute(path);
          toasts.addSuccess({
            title: i18n.translate('kibana-react.overviewFooter.changeDefaultRouteSuccessToast', {
              defaultMessage: 'Landing page updated',
            }),
          });
        }}
        size="xs"
      >
        <FormattedMessage
          id="kibana-react.overviewFooter.makeDefaultRouteLink"
          defaultMessage="Make this my landing page"
        />
      </EuiButtonEmpty>
    );

  return (
    <footer className={`kbnOverviewFooter`}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          {isAdvancedSettingsEnabled ? defaultRoutebutton : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RedirectAppLinks application={application}>
            <EuiButtonEmpty
              data-test-subj="allPlugins"
              href={'/app/home#/feature_directory'}
              size="xs"
              iconType="apps"
            >
              <FormattedMessage
                id="kibana-react.overviewFooter.appDirectoryButtonLabel"
                defaultMessage="View app directory"
              />
            </EuiButtonEmpty>
          </RedirectAppLinks>
        </EuiFlexItem>
      </EuiFlexGroup>
    </footer>
  );
};
