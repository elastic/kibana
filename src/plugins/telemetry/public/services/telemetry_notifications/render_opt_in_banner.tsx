/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { CoreStart } from 'kibana/public';
import { OptInBanner } from '../../components/opt_in_banner';
import { toMountPoint } from '../../../../kibana_react/public';

interface RenderBannerConfig {
  overlays: CoreStart['overlays'];
  setOptIn: (isOptIn: boolean) => Promise<any>;
}

export function renderOptInBanner({ setOptIn, overlays }: RenderBannerConfig) {
  const mount = toMountPoint(<OptInBanner onChangeOptInClick={setOptIn} />);
  const bannerId = overlays.banners.add(mount, 10000);

  return bannerId;
}
