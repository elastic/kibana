/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { TelemetryService } from './services';
import { TelemetryConstants } from './plugin';

export function renderWelcomeTelemetryNotice(
  telemetryService: TelemetryService,
  addBasePath: (url: string) => string,
  telemetryConstants: TelemetryConstants
) {
  const WelcomeTelemetryNoticeLazy = withSuspense(
    React.lazy(() =>
      import('./components/welcome_telemetry_notice').then(({ WelcomeTelemetryNotice }) => ({
        default: WelcomeTelemetryNotice,
      }))
    )
  );

  return (
    <WelcomeTelemetryNoticeLazy
      telemetryService={telemetryService}
      telemetryConstants={telemetryConstants}
      addBasePath={addBasePath}
    />
  );
}
