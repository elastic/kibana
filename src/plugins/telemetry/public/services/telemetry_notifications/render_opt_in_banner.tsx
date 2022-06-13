/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { OptInBanner } from '../../components/opt_in_banner';
import { TelemetryConstants } from '../..';

interface RenderBannerConfig {
  overlays: OverlayStart;
  setOptIn: (isOptIn: boolean) => Promise<unknown>;
  telemetryConstants: TelemetryConstants;
}

export function renderOptInBanner({ setOptIn, overlays, telemetryConstants }: RenderBannerConfig) {
  const mount = toMountPoint(
    <OptInBanner onChangeOptInClick={setOptIn} telemetryConstants={telemetryConstants} />
  );
  const bannerId = overlays.banners.add(mount, 10000);

  return bannerId;
}
