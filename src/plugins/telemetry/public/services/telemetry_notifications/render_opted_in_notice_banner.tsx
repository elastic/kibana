/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { HttpStart, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { OptedInNoticeBanner } from '../../components/opted_in_notice_banner';
import { TelemetryConstants } from '../..';

interface RenderBannerConfig {
  http: HttpStart;
  overlays: OverlayStart;
  onSeen: () => void;
  telemetryConstants: TelemetryConstants;
}
export function renderOptedInNoticeBanner({
  onSeen,
  overlays,
  http,
  telemetryConstants,
}: RenderBannerConfig) {
  const mount = toMountPoint(
    <OptedInNoticeBanner
      onSeenBanner={onSeen}
      http={http}
      telemetryConstants={telemetryConstants}
    />
  );
  const bannerId = overlays.banners.add(mount, 10000);

  return bannerId;
}
