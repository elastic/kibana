/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

import type { ContentSourceFlyoutProps } from './components';

import { ContentSourceLoader } from './components';
import { useServices } from './services';

export function useOpenContentSource() {
  const services = useServices();
  const { openFlyout } = services;
  const flyout = useRef<OverlayRef | null>(null);

  return useCallback(
    (args: ContentSourceFlyoutProps) => {
      const closeFlyout = () => {
        flyout.current?.close();
      };

      flyout.current = openFlyout(<ContentSourceLoader {...args} onClose={closeFlyout} />, {
        maxWidth: 600,
        size: 'm',
        ownFocus: true,
        hideCloseButton: true,
      });

      return closeFlyout;
    },
    [openFlyout]
  );
}
