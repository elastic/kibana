/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TelemetryService } from './services';
import { TelemetryConstants } from './plugin';

export function renderWelcomeTelemetryNotice(
  telemetryService: TelemetryService,
  addBasePath: (url: string) => string,
  telemetryConstants: TelemetryConstants
) {
  return (
    <>
      <EuiTextColor className="euiText--small" color="subdued">
        <FormattedMessage
          id="telemetry.dataManagementDisclaimerPrivacy"
          defaultMessage="To learn about how usage data helps us manage and improve our products and services, see our "
        />
        <EuiLink href={telemetryConstants.getPrivacyStatementUrl()} target="_blank" rel="noopener">
          <FormattedMessage
            id="telemetry.dataManagementDisclaimerPrivacyLink"
            defaultMessage="Privacy Statement."
          />
        </EuiLink>
        {renderTelemetryEnabledOrDisabledText(telemetryService, addBasePath)}
      </EuiTextColor>
      <EuiSpacer size="xs" />
    </>
  );
}

function renderTelemetryEnabledOrDisabledText(
  telemetryService: TelemetryService,
  addBasePath: (url: string) => string
) {
  if (!telemetryService.userCanChangeSettings || !telemetryService.getCanChangeOptInStatus()) {
    return null;
  }

  const isOptedIn = telemetryService.getIsOptedIn();

  if (isOptedIn) {
    return (
      <>
        <FormattedMessage
          id="telemetry.dataManagementDisableCollection"
          defaultMessage=" To stop collection, "
        />
        <EuiLink href={addBasePath('management/kibana/settings')}>
          <FormattedMessage
            id="telemetry.dataManagementDisableCollectionLink"
            defaultMessage="disable usage data here."
          />
        </EuiLink>
      </>
    );
  } else {
    return (
      <>
        <FormattedMessage
          id="telemetry.dataManagementEnableCollection"
          defaultMessage=" To start collection, "
        />
        <EuiLink href={addBasePath('management/kibana/settings')}>
          <FormattedMessage
            id="telemetry.dataManagementEnableCollectionLink"
            defaultMessage="enable usage data here."
          />
        </EuiLink>
      </>
    );
  }
}
