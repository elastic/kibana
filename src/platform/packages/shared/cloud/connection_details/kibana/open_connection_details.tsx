/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import * as conn from '..';

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
  const flyoutRef = start.core.overlays.openSystemFlyout(
    <conn.KibanaConnectionDetailsProvider
      {...props}
      onNavigation={() => {
        flyoutRef?.close();
      }}
    >
      <conn.ConnectionDetailsFlyoutContent />
    </conn.KibanaConnectionDetailsProvider>,
    {
      // title is needed for flyout system
      title: i18n.translate('cloud.connectionDetails.flyout.title', {
        defaultMessage: 'Connection details',
      }),
      size: 's',
    }
  );

  return flyoutRef;
};
