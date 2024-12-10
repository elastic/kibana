/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, HttpStart, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { withSuspense } from '@kbn/shared-ux-utility';
import { TelemetryService } from '..';
import type { TelemetryConstants } from '../..';

interface RenderBannerConfig
  extends Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'> {
  http: HttpStart;
  overlays: OverlayStart;
  onSeen: () => void;
  telemetryConstants: TelemetryConstants;
  telemetryService: TelemetryService;
}

export function renderOptInStatusNoticeBanner({
  onSeen,
  overlays,
  http,
  telemetryConstants,
  telemetryService,
  ...startServices
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
    startServices
  );

  const bannerId = overlays.banners.add(mount, 10000);
  return bannerId;
}
