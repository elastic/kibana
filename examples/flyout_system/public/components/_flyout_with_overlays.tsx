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

interface SessionFlyoutProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  overlays: OverlayStart;
}

const ChildFlyoutContent: React.FC<Pick<SessionFlyoutProps, 'childSize' | 'childMaxWidth'>> =
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
        <EuiSpacer size="m" />
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
  childMaxWidth?: number;
  overlays: OverlayStart;
  childFlyoutRefA: React.MutableRefObject<OverlayRef | null>;
  childFlyoutRefB: React.MutableRefObject<OverlayRef | null>;
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
    childMaxWidth,
    overlays,
    childFlyoutRefA,
    childFlyoutRefB,
    handleCloseFlyout,
  } = props;

  const [isChildFlyoutAOpen, setIsChildFlyoutAOpen] = useState<boolean>(false);
  const [isChildFlyoutBOpen, setIsChildFlyoutBOpen] = useState<boolean>(false);

  const handleCloseChildFlyoutA = useCallback(() => {
    if (childFlyoutRefA.current) {
      childFlyoutRefA.current.close();
      childFlyoutRefA.current = null;
      setIsChildFlyoutAOpen(false);
    }
  }, [childFlyoutRefA]);
  const handleCloseChildFlyoutB = useCallback(() => {
    if (childFlyoutRefB.current) {
      childFlyoutRefB.current.close();
      childFlyoutRefB.current = null;
      setIsChildFlyoutBOpen(false);
    }
  }, [childFlyoutRefB]);

  const openChildFlyoutA = useCallback(() => {
    handleCloseChildFlyoutB(); // Ensure only one child flyout is open at a time
    childFlyoutRefA.current = overlays.openSystemFlyout(
      <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />,
      {
        id: `childFlyout-${title}`,
        title: `Child flyout A of ${title}`,
        session: 'inherit',
        size: childSize,
        maxWidth: childMaxWidth,
        onActive: () => {
          console.log('activate child flyout', title); // eslint-disable-line no-console
        },
        onClose: () => {
          console.log('close child flyout', title); // eslint-disable-line no-console
          childFlyoutRefA.current = null;
          setIsChildFlyoutAOpen(false);
        },
      }
    );
    setIsChildFlyoutAOpen(true);
  }, [childSize, childMaxWidth, overlays, title, childFlyoutRefA, handleCloseChildFlyoutB]);

  const openChildFlyoutB = useCallback(() => {
    handleCloseChildFlyoutA(); // Ensure only one child flyout is open at a time
    childFlyoutRefB.current = overlays.openSystemFlyout(
      <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />,
      {
        id: `childFlyout-${title}-B`,
        title: `Child flyout B of ${title}`,
        session: 'inherit',
        size: childSize,
        maxWidth: childMaxWidth,
        onActive: () => {
          console.log('activate child flyout B', title); // eslint-disable-line no-console
        },
        onClose: () => {
          console.log('close child flyout B', title); // eslint-disable-line no-console
          childFlyoutRefB.current = null;
          setIsChildFlyoutBOpen(false);
        },
      }
    );
    setIsChildFlyoutBOpen(true);
  }, [childSize, childMaxWidth, overlays, title, childFlyoutRefB, handleCloseChildFlyoutA]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={`flyoutHeading-${title}`}>
            Flyout with <EuiCode>openSystemFlyout</EuiCode>: {title}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
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
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            Below is some filler content to demonstrate scrolling behavior.
            {childSize && (
              <>
                {' '}
                Scroll down to access the button to <strong>open the child flyout</strong>.
              </>
            )}
          </p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Sed vel lacus id magna laoreet aliquam. Praesent aliquam in tellus eu pellentesque.
            Nulla facilisi. Sed pulvinar, massa vitae interdum pulvinar, risus lectus porta nunc,
            vel efficitur turpis odio nec nisi. Donec nec justo eget felis facilisis fermentum.
            Aliquam porttitor mauris sit amet orci. Aenean dignissim pellentesque felis, non
            volutpat arcu. Morbi a enim in magna semper bibendum. Etiam scelerisque, nunc ac egestas
            consequat, odio nibh euismod nulla, eget auctor orci nibh vel nisi. Aliquam erat
            volutpat. Mauris vel neque sit amet nunc gravida congue sed sit amet purus. Quisque
            lacus quam, egestas ac tincidunt a, lacinia vel velit. Aenean facilisis nulla vitae urna
            tincidunt congue sed ut dui. Morbi malesuada nulla nec purus convallis consequat.
            Vivamus id mollis quam. Morbi ac commodo nulla.
          </p>
        </EuiText>
        <EuiSpacer />
        {childSize && (
          <>
            <EuiButton onClick={isChildFlyoutAOpen ? handleCloseChildFlyoutA : openChildFlyoutA}>
              {isChildFlyoutAOpen ? 'Close child flyout A' : 'Open child flyout A'}
            </EuiButton>{' '}
            <EuiButton onClick={isChildFlyoutBOpen ? handleCloseChildFlyoutB : openChildFlyoutB}>
              {isChildFlyoutBOpen ? 'Close child flyout B' : 'Open child flyout B'}
            </EuiButton>
          </>
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

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(false);
  const flyoutRef = useRef<OverlayRef | null>(null);
  const childFlyoutRefA = useRef<OverlayRef | null>(null);
  const childFlyoutRefB = useRef<OverlayRef | null>(null);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    // Close child flyout first if it's open
    if (childFlyoutRefA.current) {
      childFlyoutRefA.current.close();
      childFlyoutRefA.current = null;
    }
    if (childFlyoutRefB.current) {
      childFlyoutRefB.current.close();
      childFlyoutRefB.current = null;
    }

    // Then close main flyout
    if (flyoutRef.current) {
      flyoutRef.current.close();
      flyoutRef.current = null;
      setIsFlyoutOpen(false);
    }
  }, []);

  const openFlyout = useCallback(() => {
    flyoutRef.current = overlays.openSystemFlyout(
      <FlyoutContent
        title={title}
        flyoutType={flyoutType}
        flyoutOwnFocus={flyoutOwnFocus}
        mainSize={mainSize}
        mainMaxWidth={mainMaxWidth}
        childSize={childSize}
        childMaxWidth={childMaxWidth}
        overlays={overlays}
        childFlyoutRefA={childFlyoutRefA}
        childFlyoutRefB={childFlyoutRefB}
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
        onClose: handleCloseFlyout,
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
    childMaxWidth,
    handleCloseFlyout,
    overlays,
    mainFlyoutOnActive,
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

SessionFlyout.displayName = 'SessionFlyoutFromOverlaysService';

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

NonSessionFlyout.displayName = 'NonSessionFlyoutFromOverlaysService';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = ({ overlays, rendering }) => (
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
        listItems={[
          {
            title: 'Session X: main size = s, child size = s',
            description: (
              <SessionFlyout title="Session X" mainSize="s" childSize="s" overlays={overlays} />
            ),
          },
          {
            title: 'Session Y: main size = m, child size = s',
            description: (
              <SessionFlyout title="Session Y" mainSize="m" childSize="s" overlays={overlays} />
            ),
          },
          {
            title: 'Session Z: main size = fill',
            description: <SessionFlyout title="Session Z" mainSize="fill" overlays={overlays} />,
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
