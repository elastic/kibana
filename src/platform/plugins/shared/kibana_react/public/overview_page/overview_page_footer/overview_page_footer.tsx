/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, MouseEvent } from 'react';
import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useKibana } from '../../context';
import { useUiSetting$ } from '../../ui_settings';

interface Props {
  addBasePath: (path: string) => string;
  /** The path to set as the new default route in advanced settings */
  path: string;
  /** Callback function to invoke when the user wants to set their default route to the current page */
  onSetDefaultRoute?: (event: MouseEvent) => void;
  /** Callback function to invoke when the user wants to change their default route button is changed */
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
  if (!show && !save) return <></>;

  const defaultRouteButton = defaultRoute.includes(path) ? (
    <RedirectAppLinks
      coreStart={{
        application,
      }}
    >
      <EuiButtonEmpty
        className="kbnOverviewPageFooter__button"
        flush="both"
        iconType="home"
        size="s"
        onClick={(event: MouseEvent) => {
          application.navigateToUrl(
            addBasePath('/app/management/kibana/settings?query=default+route')
          );
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
      size="s"
    >
      <FormattedMessage
        id="kibana-react.pageFooter.makeDefaultRouteLink"
        defaultMessage="Make this my landing page"
      />
    </EuiButtonEmpty>
  );

  return (
    // Note: Using KibanaPageTemplate.Section instead of EuiPageTemplate causes Jest failures and bundle size issues
    <EuiPageTemplate.Section component="footer" className="kbnOverviewPageFooter">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <div>{defaultRouteButton}</div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
