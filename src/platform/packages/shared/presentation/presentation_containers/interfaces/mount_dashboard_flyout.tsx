/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { CoreStart, OverlayFlyoutOpenOptions } from '@kbn/core/public';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { tracksOverlays } from '..';

const defaultFlyoutProps: OverlayFlyoutOpenOptions = {
  size: 'm',
  type: 'push',
  paddingSize: 'm',
  maxWidth: 500,
  hideCloseButton: true,
  ownFocus: true,
  isResizable: true,
  outsideClickCloses: true,
};

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

const EditPanelWrapper = ({
  closeFlyout,
  loadContent,
}: {
  closeFlyout: () => void;
  loadContent: (({ closeFlyout }: { closeFlyout: () => void }) => Promise< JSX.Element | void>);
}) => {
  const [EditFlyoutPanel, setEditFlyoutPanel] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await loadContent?.({ closeFlyout });
    if (editFlyoutContent) {
      setEditFlyoutPanel(editFlyoutContent);
    } else {
      // If no content is returned, we close the flyout
      closeFlyout();
      throw new Error('Edit flyout content is not available');
    }
  }, []);

  return EditFlyoutPanel ?? LoadingPanel;
};

export const openDashboardFlyout = ({
  core,
  api,
  loadContent,
  flyoutProps,
}: {
  core: CoreStart;
  api?: unknown;
  loadContent: (({ closeFlyout }: { closeFlyout: () => void }) => Promise< JSX.Element | void>);
  flyoutProps?: Partial<OverlayFlyoutOpenOptions>;
}) => {
  const overlayTracker = tracksOverlays(api) ? api : undefined;

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
  }

  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(<EditPanelWrapper closeFlyout={onClose} loadContent={loadContent} />, core),
    { ...defaultFlyoutProps, onClose, ...flyoutProps }
  );
  overlayTracker?.openOverlay(flyoutRef);
};

