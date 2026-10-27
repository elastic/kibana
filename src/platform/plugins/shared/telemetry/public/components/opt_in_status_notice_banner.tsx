/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core/public';
import { OptInMessage } from './opt_in_message';
import type { TelemetryService } from '../services';
import type { TelemetryConstants } from '..';

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
    <KbnInfoCallout
      title={bannerTitle}
      actionProps={{
        primary: {
          children: (
            <FormattedMessage
              id="telemetry.telemetryOptedInDismissMessage"
              defaultMessage="Dismiss"
            />
          ),
          onClick: onSeenBanner,
        },
      }}
    >
      <OptInMessage
        telemetryConstants={telemetryConstants}
        telemetryService={telemetryService}
        addBasePath={addBasePath}
        onClick={onSeenBanner}
      />
    </KbnInfoCallout>
  );
};
