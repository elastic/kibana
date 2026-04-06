/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { toMountPoint } from '@kbn/react-kibana-mount';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';

interface NonSessionFlyoutsProps {
  overlays: OverlayStart;
  rendering: RenderingService;
}

const OverlaysFlyout: React.FC<NonSessionFlyoutsProps> = React.memo(({ overlays, rendering }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const flyoutRef = useRef<OverlayRef | null>(null);

  // Ref for manual focus management - return focus to trigger button
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openFlyout = useCallback(() => {
    // Create a handler that will be called to close the flyout
    const handleClose = () => {
      if (flyoutRef.current) {
        flyoutRef.current.close();
        flyoutRef.current = null;
      }
      setIsFlyoutOpen(false);

      // Return focus to trigger button after closing flyout
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 100);
    };

    const ref = overlays.openFlyout(
      toMountPoint(
        <>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2 id="globalFlyoutHeading">Global Flyout</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                This flyout is opened using the non-session aware <EuiCode>openFlyout</EuiCode> API.
              </p>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleClose} aria-label="Close">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </>,
        rendering
      ),
      {
        id: 'globalFlyout',
        container: null,
        size: 'm',
        ['aria-labelledby']: 'globalFlyoutHeading',
        type: 'overlay',
        ownFocus: true,
        onClose: handleClose,
      }
    );
    flyoutRef.current = ref;
    setIsFlyoutOpen(true);
  }, [overlays, rendering]);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton buttonRef={triggerRef} onClick={openFlyout} disabled={isFlyoutOpen}>
          Open Global Flyout
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

OverlaysFlyout.displayName = 'GlobalFlyoutFromOverlaysService';

const SessionNeverFlyout: React.FC = React.memo(() => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  // Refs for manual focus management
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpenFlyout = () => {
    setIsFlyoutVisible(true);
  };

  // BUG: EuiFlyout does not call onActive when session={false}
  const flyoutOnActive = useCallback(() => {
    console.log('activate non-session flyout'); // eslint-disable-line no-console
  }, []);

  const flyoutOnClose = useCallback(() => {
    console.log('close non-session flyout'); // eslint-disable-line no-console
    setIsFlyoutVisible(false);

    // Return focus to trigger button after closing flyout
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 100);
  }, []);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiButton buttonRef={triggerRef} disabled={isFlyoutVisible} onClick={handleOpenFlyout}>
              Open Global Flyout
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutVisible && (
        <EuiFlyout
          aria-labelledby="nonSessionFlyoutTitle"
          onActive={flyoutOnActive}
          onClose={flyoutOnClose}
          type="overlay"
          container={null}
          size="m"
          ownFocus={true}
          session="never"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiText>
              <h2 id="nonSessionFlyoutTitle">Global flyout</h2>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                This flyout is rendered using <EuiCode>EuiFlyout</EuiCode> directly without session
                management.
              </p>
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={flyoutOnClose} aria-label="Close">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
});

SessionNeverFlyout.displayName = 'GlobalFlyoutFromComponents';

export const NonSessionFlyouts: React.FC<NonSessionFlyoutsProps> = ({ overlays, rendering }) => (
  <>
    <EuiTitle>
      <h2>Non-session flyouts</h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          With <EuiCode>{'session="never"'}</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'Global flyout: size = m',
            description: <SessionNeverFlyout />,
          },
        ]}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="s">
        <h3>
          With <EuiCode>core.overlays.openFlyout</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'Global flyout: size = m',
            description: <OverlaysFlyout overlays={overlays} rendering={rendering} />,
          },
        ]}
      />
    </EuiPanel>
  </>
);
