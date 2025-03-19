/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense } from 'react';

import { OverlayRef } from '@kbn/core/public';
import { EuiLoadingSpinner, htmlIdGenerator } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { CanAddNewPanel } from '@kbn/presentation-containers';
import { core } from '../kibana_services';

const LazyAddPanelFlyout = React.lazy(async () => {
  const module = await import('./add_from_library_flyout');
  return { default: module.AddFromLibraryFlyout };
});

const htmlId = htmlIdGenerator('modalTitleId');

export const openAddFromLibraryFlyout = ({
  container,
  onClose,
}: {
  container: CanAddNewPanel;
  onClose?: () => void;
}): OverlayRef => {
  const modalTitleId = htmlId();

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyAddPanelFlyout container={container} modalTitleId={modalTitleId} />
      </Suspense>,
      core
    ),
    {
      ownFocus: true,
      onClose: (overlayRef) => {
        if (onClose) onClose();
        overlayRef.close();
      },
      size: 'm',
      maxWidth: 500,
      paddingSize: 'm',
      'data-test-subj': 'dashboardAddPanel',
      'aria-labelledby': modalTitleId,
    }
  );

  return flyoutRef;
};
