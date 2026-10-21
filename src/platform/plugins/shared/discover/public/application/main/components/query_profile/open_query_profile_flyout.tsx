/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryProfileFlyout, type QueryProfileFlyoutProps } from './query_profile_flyout';

/** Opens the ES|QL query profile flyout. Closing it resolves `onClose`. */
export function openQueryProfileFlyout({
  core,
  loadProfile,
  onClose,
}: {
  core: CoreStart;
  loadProfile: QueryProfileFlyoutProps['loadProfile'];
  onClose?: () => void;
}): OverlayRef {
  const flyout = core.overlays.openFlyout(
    toMountPoint(<QueryProfileFlyout loadProfile={loadProfile} />, core),
    {
      size: 560,
      maxWidth: 720,
      isResizable: true,
      ownFocus: true,
      'aria-labelledby': 'discoverQueryProfileTitle',
      'data-test-subj': 'discoverQueryProfileOverlay',
    }
  );

  if (onClose) {
    flyout.onClose.then(onClose);
  }

  return flyout;
}
