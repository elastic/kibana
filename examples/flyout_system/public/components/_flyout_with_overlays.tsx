/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiButton, EuiFlyout, EuiFlyoutBody, EuiSpacer, EuiText } from '@elastic/eui';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

export interface FlyoutWithOverlaysProps {
  rendering: RenderingService;
  overlays: OverlayStart;
  flyoutType: 'overlay' | 'push';
}

const FlyoutContent: React.FC<FlyoutWithOverlaysProps> = ({ flyoutType }) => {
  const [childFlyoutIsOpen, setChildFlyoutIsOpen] = useState<boolean>(false);

  return (
    <>
      <EuiFlyoutBody>
        <EuiText>
          <p>This flyout is opened using the overlays service.</p>
        </EuiText>
        <EuiSpacer />
        <EuiButton onClick={() => setChildFlyoutIsOpen(true)} disabled={!!childFlyoutIsOpen}>
          Open child flyout
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyout
        aria-label="Child flyout"
        onClose={() => setChildFlyoutIsOpen(false)}
        size="fill"
        isOpen={childFlyoutIsOpen}
        type={flyoutType}
      >
        <EuiFlyoutBody>
          <EuiText>
            <p>This is a child flyout opened from the main flyout.</p>
          </EuiText>
        </EuiFlyoutBody>
      </EuiFlyout>
    </>
  );
};

export const FlyoutWithOverlays: React.FC<FlyoutWithOverlaysProps> = (props) => {
  const { overlays, rendering, flyoutType } = props;
  const [flyoutSession, setFlyoutSession] = useState<OverlayRef | null>(null);

  const openFlyout = () => {
    const _flyoutSession = overlays.openFlyout(
      toMountPoint(<FlyoutContent {...props} />, rendering),
      {
        session: true,
        'aria-label': 'Main flyout',
        type: flyoutType,
      }
    );
    _flyoutSession.onClose.then(() => setFlyoutSession(null));
    setFlyoutSession(_flyoutSession);
  };

  const closeFlyout = () => {
    flyoutSession?.close();
  };

  return (
    <EuiText>
      <EuiButton onClick={!!flyoutSession ? closeFlyout : openFlyout}>
        {!!flyoutSession ? 'Close' : 'Open'} main flyout
      </EuiButton>
    </EuiText>
  );
};

FlyoutWithOverlays.displayName = 'FlyoutWithOverlays';
