/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';

import { CanAddNewPanel } from '@kbn/presentation-containers';
import { withSuspense } from '@kbn/shared-ux-utility';
// import { AddFromLibraryFlyout } from './add_from_library_flyout';

const LazyAddPanelFlyout = React.lazy(async () => {
  const module = await import('./add_from_library_flyout');
  return { default: module.AddFromLibraryFlyout }; // TODO: this is how we should do it
});

const LoadingPanel = (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiSkeletonTitle size="xs" />
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiSkeletonText />
    </EuiFlyoutBody>
  </>
);

const AddPanelFlyout = withSuspense(LazyAddPanelFlyout, LoadingPanel);

export const getAddFromLibraryFlyout = ({
  api,
  modalTitleId,
}: {
  api: CanAddNewPanel;
  modalTitleId?: string;
}) => {
  return <AddPanelFlyout container={api} modalTitleId={modalTitleId} />;
};
