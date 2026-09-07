/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import * as conn from '..';

const FLYOUT_ID = 'connectionDetailsModalFlyout';
const FLYOUT_HEADER_ID = 'connectionDetailsModalTitle';

export interface OpenConnectionDetailsParams {
  props: conn.KibanaConnectionDetailsProviderProps;
  start: {
    core: {
      overlays: CoreStart['overlays'];
      i18n: CoreStart['i18n'];
      analytics?: CoreStart['analytics'];
      theme: CoreStart['theme'];
      userProfile: CoreStart['userProfile'];
    };
  };
}

export const openConnectionDetails = async ({ props, start }: OpenConnectionDetailsParams) => {
  const FlyoutContent = () => (
    <conn.KibanaConnectionDetailsProvider
      {...props}
      onNavigation={() => {
        flyoutRef?.close();
      }}
    >
      <conn.ConnectionDetailsFlyoutContent headerId={FLYOUT_HEADER_ID} />
    </conn.KibanaConnectionDetailsProvider>
  );

  const flyoutRef = start.core.overlays.openSystemFlyout(<FlyoutContent />, {
    id: FLYOUT_ID,
    ['aria-labelledby']: FLYOUT_HEADER_ID,
    size: 's',
  });

  return flyoutRef;
};
