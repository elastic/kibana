/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense } from 'react';

import { OverlayRef } from '@kbn/core/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

import { IContainer } from '../lib';
import { core } from '../kibana_services';

const LazyAddPanelFlyout = React.lazy(async () => {
  const module = await import('./add_panel_flyout');
  return { default: module.AddPanelFlyout };
});

export const openAddPanelFlyout = ({
  container,
  onAddPanel,
  onClose,
}: {
  container: IContainer;
  onAddPanel?: (id: string) => void;
  onClose?: () => void;
}): OverlayRef => {
  // send the overlay ref to the root embeddable if it is capable of tracking overlays
  const flyoutSession = core.overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<EuiLoadingSpinner />}>
        <LazyAddPanelFlyout container={container} onAddPanel={onAddPanel} />
      </Suspense>,
      { theme$: core.theme.theme$ }
    ),
    {
      'data-test-subj': 'dashboardAddPanel',
      ownFocus: true,
      onClose: (overlayRef) => {
        if (onClose) onClose();
        overlayRef.close();
      },
    }
  );

  return flyoutSession;
};
