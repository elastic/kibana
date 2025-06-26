/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint @elastic/eui/href-or-on-click:0 */

import * as React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';
import { OptInMessage } from './opt_in_message';
import { TelemetryService } from '../services';
import { TelemetryConstants } from '..';

interface Props {
  http: HttpSetup;
  onSeenBanner: () => unknown;
  telemetryConstants: TelemetryConstants;
  telemetryService: TelemetryService;
}

export const OptInStatusNoticeBanner: React.FC<Props> = ({
  onSeenBanner,
  http,
  telemetryConstants,
  telemetryService,
}) => {
  const addBasePath = http.basePath.prepend;

  const bannerTitle = i18n.translate('telemetry.telemetryOptedInNoticeTitle', {
    defaultMessage: 'Help us improve the Elastic Stack',
  });

  return (
    <EuiCallOut title={bannerTitle}>
      <OptInMessage
        telemetryConstants={telemetryConstants}
        telemetryService={telemetryService}
        addBasePath={addBasePath}
        onClick={onSeenBanner}
      />
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={onSeenBanner}>
        <FormattedMessage id="telemetry.telemetryOptedInDismissMessage" defaultMessage="Dismiss" />
      </EuiButton>
    </EuiCallOut>
  );
};
