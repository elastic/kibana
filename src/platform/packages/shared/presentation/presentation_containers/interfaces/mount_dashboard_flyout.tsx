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
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiSkeletonText, EuiSkeletonTitle } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import useAsync from 'react-use/lib/useAsync';
import { tracksOverlays } from '..';

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
  getEditFlyout,
}: {
  closeFlyout: () => void;
  getEditFlyout: (() => Promise<void | JSX.Element | null>) | undefined;
}) => {
  const [EditFlyoutPanel, setEditFlyoutPanel] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await getEditFlyout?.();
    if (editFlyoutContent) {
      setEditFlyoutPanel(React.cloneElement(editFlyoutContent, { closeFlyout }));
    }
  }, []);

  return EditFlyoutPanel ?? LoadingPanel;
};

export const mountDashboardFlyout = ({
  core,
  api,
  getEditFlyout,
  flyoutPropsOverrides,
}: {
  core: CoreStart;
  api?: EmbeddableApiContext['embeddable'];
  getEditFlyout: (() => Promise<void | JSX.Element | null>) | undefined;
  flyoutPropsOverrides?: Partial<OverlayFlyoutOpenOptions>;
}) => {
  const overlayTracker = tracksOverlays(api) ? api : undefined;
  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
  };
  const flyoutRef = core.overlays.openFlyout(
    toMountPoint(<EditPanelWrapper closeFlyout={onClose} getEditFlyout={getEditFlyout} />, core),
    { ...flyoutProps, onClose, ...flyoutPropsOverrides }
  );
  overlayTracker?.openOverlay(flyoutRef);
};

const flyoutProps: OverlayFlyoutOpenOptions = {
  size: 's',
  type: 'push',
  paddingSize: 'm',
  maxWidth: 800,
  hideCloseButton: true,
  isResizable: true,
  outsideClickCloses: true,
};
