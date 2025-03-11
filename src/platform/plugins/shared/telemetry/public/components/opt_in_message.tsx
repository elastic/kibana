/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IBasePath } from '@kbn/core-http-browser';
import type { TelemetryService } from '../services';
import type { TelemetryConstants } from '..';
import { PATH_TO_ADVANCED_SETTINGS } from '../../common/constants';

export interface OptInMessageProps {
  telemetryConstants: TelemetryConstants;
  telemetryService: TelemetryService;
  addBasePath: IBasePath['prepend'];
  onClick?: () => unknown;
}

export const OptInMessage: React.FC<OptInMessageProps> = ({
  addBasePath,
  telemetryService,
  telemetryConstants,
  onClick,
}) => {
  return (
    <React.Fragment>
      <FormattedMessage
        id="telemetry.dataManagementDisclaimerPrivacy"
        defaultMessage="{optInStatus}
          This allows us to learn what our users are most interested in, so we can improve our products and services.
          Refer to our {privacyStatementLink}."
        values={{
          optInStatus: (
            <strong>
              {telemetryService.isOptedIn ? (
                <FormattedMessage
                  id="telemetry.enabledStatus"
                  defaultMessage="Usage collection is enabled."
                />
              ) : (
                <FormattedMessage
                  id="telemetry.disabledStatus"
                  defaultMessage="Usage collection is disabled."
                />
              )}
            </strong>
          ),
          privacyStatementLink: (
            /* eslint-disable-next-line @elastic/eui/href-or-on-click */
            <EuiLink
              onClick={onClick}
              href={telemetryConstants.getPrivacyStatementUrl()}
              target="_blank"
              rel="noopener"
            >
              <FormattedMessage
                id="telemetry.dataManagementDisclaimerPrivacyLink"
                defaultMessage="Privacy Statement"
              />
            </EuiLink>
          ),
        }}
      />{' '}
      {renderTelemetryEnabledOrDisabledText(telemetryService, addBasePath, onClick)}
    </React.Fragment>
  );
};

function renderTelemetryEnabledOrDisabledText(
  telemetryService: TelemetryService,
  addBasePath: (url: string) => string,
  onClick?: () => unknown
) {
  if (!telemetryService.userCanChangeSettings || !telemetryService.getCanChangeOptInStatus()) {
    return null;
  }

  const isOptedIn = telemetryService.getIsOptedIn();
  const actionMessage = isOptedIn ? (
    <FormattedMessage
      id="telemetry.dataManagementDisableCollectionLink"
      defaultMessage="Disable usage collection."
    />
  ) : (
    <FormattedMessage
      id="telemetry.dataManagementEnableCollectionLink"
      defaultMessage="Enable usage collection."
    />
  );

  return (
    /* eslint-disable-next-line @elastic/eui/href-or-on-click */
    <EuiLink href={addBasePath(PATH_TO_ADVANCED_SETTINGS)} onClick={onClick}>
      {actionMessage}
    </EuiLink>
  );
}
