/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

import type { ManagedFlyoutApi } from '@kbn/core-overlays-browser';

// Get the singleton service instance
import { managedFlyoutService as service } from './managed_flyout_service';

export function useManagedFlyout(): ManagedFlyoutApi {
  return useMemo(
    () => ({
      openFlyout: service.openFlyout.bind(service),
      closeFlyout: service.closeFlyout.bind(service),
      nextFlyout: service.nextFlyout.bind(service),
      openChildFlyout: service.openChildFlyout.bind(service),
      isFlyoutOpen: service.isFlyoutOpen.bind(service),
      goBack: service.goBack.bind(service),
      canGoBack: service.canGoBack.bind(service),
      closeChildFlyout: service.closeChildFlyout.bind(service),
    }),
    []
  );
}
