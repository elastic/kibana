/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import { OptedInNoticeBanner } from '../../components/opted_in_notice_banner';
import { toMountPoint } from '../../../../kibana_react/public';

interface RenderBannerConfig {
  http: CoreStart['http'];
  overlays: CoreStart['overlays'];
  onSeen: () => void;
}
export function renderOptedInNoticeBanner({ onSeen, overlays, http }: RenderBannerConfig) {
  const mount = toMountPoint(<OptedInNoticeBanner onSeenBanner={onSeen} http={http} />);
  const bannerId = overlays.banners.add(mount, 10000);

  return bannerId;
}
