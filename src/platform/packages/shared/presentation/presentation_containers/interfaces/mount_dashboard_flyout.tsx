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
  loadFlyout,
}: {
  closeFlyout: () => void;
  loadFlyout: (({ closeFlyout }: { closeFlyout: () => void }) => Promise< JSX.Element | null>);
}) => {
  const [EditFlyoutPanel, setEditFlyoutPanel] = React.useState<React.JSX.Element | null>(null);
  useAsync(async () => {
    const editFlyoutContent = await loadFlyout?.({ closeFlyout });
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

export const mountDashboardFlyout = ({
  core,
  api,
  loadFlyout,
  flyoutProps,
}: {
  core: CoreStart;
  api?: EmbeddableApiContext['embeddable'];
  loadFlyout: (({ closeFlyout }: { closeFlyout: () => void }) => Promise< JSX.Element | null>);
  flyoutProps?: Partial<OverlayFlyoutOpenOptions>;
}) => {
  const overlayTracker = tracksOverlays(api) ? api : undefined;
  let flyoutRef: ReturnType<CoreStart['overlays']['openFlyout']>;

  const onClose = () => {
    overlayTracker?.clearOverlays();
    flyoutRef?.close();
  }

  flyoutRef = core.overlays.openFlyout(
    toMountPoint(<EditPanelWrapper closeFlyout={onClose} loadFlyout={loadFlyout} />, core),
    { ...defaultFlyoutProps, onClose, ...flyoutProps }
  );
  overlayTracker?.openOverlay(flyoutRef);
};

