/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { HttpStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { TelemetryService } from '..';
import type { TelemetryConstants } from '../..';

interface RenderBannerConfig {
  http: HttpStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  onSeen: () => void;
  telemetryConstants: TelemetryConstants;
  telemetryService: TelemetryService;
}

export function renderOptInStatusNoticeBanner({
  onSeen,
  overlays,
  http,
  theme,
  telemetryConstants,
  telemetryService,
}: RenderBannerConfig) {
  const OptedInNoticeBannerLazy = withSuspense(
    React.lazy(() =>
      import('../../components/opt_in_status_notice_banner').then(
        ({ OptInStatusNoticeBanner }) => ({
          default: OptInStatusNoticeBanner,
        })
      )
    )
  );

  const mount = toMountPoint(
    <OptedInNoticeBannerLazy
      onSeenBanner={onSeen}
      http={http}
      telemetryConstants={telemetryConstants}
      telemetryService={telemetryService}
    />,
    { theme$: theme.theme$ }
  );

  const bannerId = overlays.banners.add(mount, 10000);
  return bannerId;
}
