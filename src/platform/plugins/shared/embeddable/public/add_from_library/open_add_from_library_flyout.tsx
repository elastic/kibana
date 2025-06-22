/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { OverlayRef } from '@kbn/core/public';
import { htmlIdGenerator,EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiSkeletonText } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { CanAddNewPanel } from '@kbn/presentation-containers';
import { core } from '../kibana_services';
import { withSuspense } from '@kbn/shared-ux-utility';

const LazyAddPanelFlyout = React.lazy(async () => {
  const module = await import('./add_from_library_flyout');
  return { default: module.AddFromLibraryFlyout }; // TODO: this is how we should do it
});

const htmlId = htmlIdGenerator('modalTitleId');


const title = 'Create Links Panel';

const FallbackComponent = <>
<EuiFlyoutHeader hasBorder>
  <EuiTitle size="s">
    <h1 id="addPanelsFlyout">
      {title || 'Loading...' }
    </h1>
  </EuiTitle>
</EuiFlyoutHeader>
<EuiFlyoutBody>
  <EuiSkeletonText/>
</EuiFlyoutBody>
</>


const AddPanelFlyout = withSuspense(
  LazyAddPanelFlyout,
  FallbackComponent
);


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
      <AddPanelFlyout container={container} modalTitleId={modalTitleId} />,
      core
    ),
    {
      type: 'push',
      ownFocus: true,
      onClose: (overlayRef) => {
        onClose?.();
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
