/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { css } from '@emotion/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core/public';

import type { RenderingService } from '@kbn/core-rendering-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FlyoutOwnFocusSwitch,
  FlyoutTypeSwitch,
} from '../utils';

export interface FlyoutFromOverlaysProps {
  overlays: OverlayStart;
  rendering: RenderingService;
}

interface FlyoutSessionProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  overlays: OverlayStart;
}

const ChildFlyoutContent: React.FC<Pick<FlyoutSessionProps, 'childSize' | 'childMaxWidth'>> =
  React.memo((props) => {
    const { childSize, childMaxWidth } = props;

    return (
      <EuiFlyoutBody>
        <EuiText>
          <p>
            This is a child flyout opened from the flyout that was opened using the{' '}
            <EuiCode>openSystemFlyout</EuiCode> method.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          listItems={createChildFlyoutDescriptionItems(
            childSize,
            childMaxWidth,
            <EuiCode>openSystemFlyout</EuiCode>
          )}
        />
      </EuiFlyoutBody>
    );
  });

interface FlyoutContentProps {
  title: string;
  flyoutType: 'overlay' | 'push';
  flyoutOwnFocus: boolean;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  isChildFlyoutOpen: boolean;
  handleCloseChildFlyout: () => void;
  openChildFlyout: () => void;
  handleCloseFlyout: () => void;
}

const FlyoutContent: React.FC<FlyoutContentProps> = React.memo((props) => {
  const {
    title,
    flyoutType,
    flyoutOwnFocus,
    mainSize,
    mainMaxWidth,
    childSize,
    isChildFlyoutOpen,
    handleCloseChildFlyout,
    openChildFlyout,
    handleCloseFlyout,
  } = props;

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={`flyoutHeading-${title}`}>Flyout {title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            This flyout uses the <EuiCode>openSystemFlyout</EuiCode> service with full EUI Flyout
            Manager integration.
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          listItems={createMainFlyoutDescriptionItems(
            flyoutType,
            flyoutOwnFocus,
            mainSize,
            mainMaxWidth,
            <EuiCode>openSystemFlyout</EuiCode>
          )}
        />
        <EuiSpacer />
        {childSize && (
          <EuiButton onClick={isChildFlyoutOpen ? handleCloseChildFlyout : openChildFlyout}>
            {isChildFlyoutOpen ? 'Close child flyout' : 'Open child flyout'}
          </EuiButton>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={handleCloseFlyout} aria-label="Close">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
});

const FlyoutSession: React.FC<FlyoutSessionProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const [isChildFlyoutOpen, setIsChildFlyoutOpen] = useState<boolean>(false);
  const flyoutRef = useRef<OverlayRef | null>(null);
  const childFlyoutRef = useRef<OverlayRef | null>(null);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console

    // Close child flyout if it's open
    if (childFlyoutRef.current) {
      childFlyoutRef.current.close();
      childFlyoutRef.current = null;
      setIsChildFlyoutOpen(false);
    }

    flyoutRef.current = null;
    setIsFlyoutOpen(false);
  }, [title]);

  const handleCloseChildFlyout = useCallback(() => {
    if (childFlyoutRef.current) {
      childFlyoutRef.current.close();
      childFlyoutRef.current = null;
      setIsChildFlyoutOpen(false);
    }
  }, []);

  const handleCloseFlyout = useCallback(() => {
    // Close child flyout first if it's open
    if (childFlyoutRef.current) {
      childFlyoutRef.current.close();
      childFlyoutRef.current = null;
      setIsChildFlyoutOpen(false);
    }

    // Then close main flyout
    if (flyoutRef.current) {
      flyoutRef.current.close();
      flyoutRef.current = null;
      setIsFlyoutOpen(false);
    }
  }, []);

  const openChildFlyout = useCallback(() => {
    if (childSize) {
      childFlyoutRef.current = overlays.openSystemFlyout(
        <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />,
        {
          id: `childFlyout-${title}`,
          title: `Child flyout of ${title}`,
          session: 'inherit',
          size: childSize,
          maxWidth: childMaxWidth,
          onActive: () => {
            console.log('activate child flyout', title); // eslint-disable-line no-console
          },
          onClose: () => {
            console.log('close child flyout', title); // eslint-disable-line no-console
            childFlyoutRef.current = null;
            setIsChildFlyoutOpen(false);
          },
        }
      );
      setIsChildFlyoutOpen(true);
    }
  }, [childSize, childMaxWidth, overlays, title]);

  const openFlyout = useCallback(() => {
    flyoutRef.current = overlays.openSystemFlyout(
      <FlyoutContent
        title={title}
        flyoutType={flyoutType}
        flyoutOwnFocus={flyoutOwnFocus}
        mainSize={mainSize}
        mainMaxWidth={mainMaxWidth}
        childSize={childSize}
        isChildFlyoutOpen={isChildFlyoutOpen}
        handleCloseChildFlyout={handleCloseChildFlyout}
        openChildFlyout={openChildFlyout}
        handleCloseFlyout={handleCloseFlyout}
      />,
      {
        id: `mainFlyout-${title}`,
        title,
        type: flyoutType,
        ownFocus: flyoutOwnFocus,
        size: mainSize,
        maxWidth: mainMaxWidth,
        onActive: mainFlyoutOnActive,
        onClose: mainFlyoutOnClose,
        ['aria-labelledby']: `flyoutHeading-${title}`,
      }
    );
    setIsFlyoutOpen(true);
  }, [
    title,
    flyoutType,
    flyoutOwnFocus,
    mainSize,
    mainMaxWidth,
    childSize,
    isChildFlyoutOpen,
    handleCloseChildFlyout,
    openChildFlyout,
    handleCloseFlyout,
    overlays,
    mainFlyoutOnActive,
    mainFlyoutOnClose,
  ]);

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <FlyoutTypeSwitch
                // switch for flyout type: push or overlay
                flyoutType={flyoutType}
                onChange={setFlyoutType}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FlyoutOwnFocusSwitch
                // switch for ownFocus behavior
                flyoutOwnFocus={flyoutOwnFocus}
                onChange={setFlyoutOwnFocus}
                disabled={flyoutType === 'push'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={openFlyout} disabled={isFlyoutOpen}>
            Open {title}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

const NonSessionFlyout: React.FC<FlyoutFromOverlaysProps> = React.memo(
  ({ overlays, rendering }) => {
    const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
    const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
    const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
    const flyoutRef = useRef<OverlayRef | null>(null);

    const openFlyout = useCallback(() => {
      // Create a handler that will be called to close the flyout
      const handleClose = () => {
        if (flyoutRef.current) {
          flyoutRef.current.close();
          flyoutRef.current = null;
        }
        setIsFlyoutOpen(false);
      };

      const ref = overlays.openFlyout(
        toMountPoint(
          <>
            <EuiFlyoutHeader>
              <EuiTitle>
                <h2 id="nonSessionFlyoutHeading">Non-session Flyout</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>
                <p>
                  This flyout is opened using the non-session aware <EuiCode>openFlyout</EuiCode>{' '}
                  API.
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
          id: 'nonSessionFlyout',
          size: 'm',
          ['aria-labelledby']: 'nonSessionFlyoutHeading',
          type: flyoutType,
          ownFocus: flyoutOwnFocus,
          onClose: handleClose,
        }
      );
      flyoutRef.current = ref;
      setIsFlyoutOpen(true);
    }, [overlays, rendering, flyoutType, flyoutOwnFocus]);

    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <FlyoutTypeSwitch
                // switch for flyout type: push or overlay
                flyoutType={flyoutType}
                onChange={setFlyoutType}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FlyoutOwnFocusSwitch
                // switch for ownFocus behavior
                flyoutOwnFocus={flyoutOwnFocus}
                onChange={setFlyoutOwnFocus}
                disabled={flyoutType === 'push'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={openFlyout} disabled={isFlyoutOpen}>
            Open Non-session Flyout
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

NonSessionFlyout.displayName = 'NonSessionFlyout';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = ({ overlays, rendering }) => {
  return (
    <>
      <EuiTitle>
        <h2>
          Flyouts with <EuiCode>core.overlays</EuiCode> services
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiTitle size="s">
          <h3>
            With <EuiCode>core.overlays.openSystemFlyout</EuiCode>
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          columnGutterSize="m"
          listItems={[
            {
              title: 'Session X: main size = s, child size = s',
              description: (
                <FlyoutSession title="Session X" mainSize="s" childSize="s" overlays={overlays} />
              ),
            },
            {
              title: 'Session Y: main size = m, child size = s',
              description: (
                <FlyoutSession title="Session Y" mainSize="m" childSize="s" overlays={overlays} />
              ),
            },
            {
              title: 'Session Z: main size = fill',
              description: <FlyoutSession title="Session Z" mainSize="fill" overlays={overlays} />,
            },
          ]}
          css={css`
            dt {
              min-width: 25em;
            }
          `}
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
          columnGutterSize="m"
          listItems={[
            {
              title: 'Non-session flyout: size = m',
              description: <NonSessionFlyout overlays={overlays} rendering={rendering} />,
            },
          ]}
          css={css`
            dt {
              min-width: 25em;
            }
          `}
        />
      </EuiPanel>
    </>
  );
};

FlyoutWithOverlays.displayName = 'FlyoutFromOverlays';
