/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

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
import { useBooleanUrlState } from '@kbn/shared-url-state';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FLYOUT_MIN_WIDTH,
  FlyoutOwnFocusSwitch,
  FlyoutTypeSwitch,
} from '../utils';
import { FlyoutDocument } from './_flyout_document';
import { MOCK_DOCUMENTS } from './demo_documents';

export interface FlyoutFromOverlaysProps {
  historyKey: symbol;
  overlays: OverlayStart;
}

interface SessionFlyoutProps {
  historyKey: symbol;
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize: 's' | 'm' | 'fill';
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
  historyKey: symbol;
  title: string;
  flyoutType: 'overlay' | 'push';
  flyoutOwnFocus: boolean;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  overlays: OverlayStart;
  childFlyoutRefA: React.MutableRefObject<OverlayRef | null>;
  childFlyoutRefB: React.MutableRefObject<OverlayRef | null>;
  handleCloseFlyout: () => void;
}

const FlyoutContent: React.FC<FlyoutContentProps> = React.memo((props) => {
  const {
    historyKey,
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

  // Refs for manual focus management - return focus to child trigger buttons
  const childTriggerARef = useRef<HTMLButtonElement>(null);
  const childTriggerBRef = useRef<HTMLButtonElement>(null);

  const handleCloseChildFlyoutA = useCallback(() => {
    if (childFlyoutRefA.current) {
      childFlyoutRefA.current.close();
      childFlyoutRefA.current = null;
      setIsChildFlyoutAOpen(false);
    }

    // Return focus to child trigger button after closing child flyout A
    setTimeout(() => {
      childTriggerARef.current?.focus();
    }, 100);
  }, [childFlyoutRefA]);
  const handleCloseChildFlyoutB = useCallback(() => {
    if (childFlyoutRefB.current) {
      childFlyoutRefB.current.close();
      childFlyoutRefB.current = null;
      setIsChildFlyoutBOpen(false);
    }

    // Return focus to child trigger button after closing child flyout B
    setTimeout(() => {
      childTriggerBRef.current?.focus();
    }, 100);
  }, [childFlyoutRefB]);

  const openChildFlyoutA = useCallback(() => {
    childFlyoutRefA.current = overlays.openSystemFlyout(
      <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />,
      {
        id: `childFlyout-${title}`,
        title: `Child flyout A of ${title}`,
        session: 'inherit',
        historyKey,
        size: childSize,
        hasChildBackground: true,
        maxWidth: childMaxWidth,
        minWidth: FLYOUT_MIN_WIDTH,
        onActive: () => {
          console.log('activate child flyout', title); // eslint-disable-line no-console
        },
        onClose: () => {
          console.log('close child flyout', title); // eslint-disable-line no-console
          childFlyoutRefA.current = null;
          setIsChildFlyoutAOpen(false);

          // Return focus to child trigger button after closing child flyout A
          setTimeout(() => {
            childTriggerARef.current?.focus();
          }, 100);
        },
      }
    );
    setIsChildFlyoutAOpen(true);
  }, [historyKey, childSize, childMaxWidth, overlays, title, childFlyoutRefA]);

  const openChildFlyoutB = useCallback(() => {
    childFlyoutRefB.current = overlays.openSystemFlyout(
      <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />,
      {
        id: `childFlyout-${title}-B`,
        title: `Child flyout B of ${title}`,
        session: 'inherit',
        historyKey,
        size: childSize,
        hasChildBackground: true,
        maxWidth: childMaxWidth,
        minWidth: FLYOUT_MIN_WIDTH,
        onActive: () => {
          console.log('activate child flyout B', title); // eslint-disable-line no-console
        },
        onClose: () => {
          console.log('close child flyout B', title); // eslint-disable-line no-console
          childFlyoutRefB.current = null;
          setIsChildFlyoutBOpen(false);

          // Return focus to child trigger button after closing child flyout B
          setTimeout(() => {
            childTriggerBRef.current?.focus();
          }, 100);
        },
      }
    );
    setIsChildFlyoutBOpen(true);
  }, [historyKey, childSize, childMaxWidth, overlays, title, childFlyoutRefB]);

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
        <FlyoutDocument document={MOCK_DOCUMENTS[0]} />
        <EuiSpacer />
        <EuiButton
          buttonRef={childTriggerARef}
          onClick={isChildFlyoutAOpen ? handleCloseChildFlyoutA : openChildFlyoutA}
          data-test-subj={`openChildFlyoutAOverlaysButton-${title}`}
        >
          {isChildFlyoutAOpen ? 'Close child flyout A' : 'Open child flyout A'}
        </EuiButton>{' '}
        <EuiButton
          buttonRef={childTriggerBRef}
          onClick={isChildFlyoutBOpen ? handleCloseChildFlyoutB : openChildFlyoutB}
          data-test-subj={`openChildFlyoutBOverlaysButton-${title}`}
        >
          {isChildFlyoutBOpen ? 'Close child flyout B' : 'Open child flyout B'}
        </EuiButton>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleCloseFlyout}
              aria-label="Close"
              data-test-subj={`closeMainFlyoutOverlaysButton-${title}`}
            >
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
});

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays, historyKey } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useBooleanUrlState(
    `flyoutOverlays_${title.replace(/\s+/g, '')}Open`
  );
  const flyoutRef = useRef<OverlayRef | null>(null);
  const childFlyoutRefA = useRef<OverlayRef | null>(null);
  const childFlyoutRefB = useRef<OverlayRef | null>(null);

  // Ref for manual focus management - return focus to trigger button
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, [setIsFlyoutOpen]);

  // Bridge URL-backed open state to the imperative overlays.openSystemFlyout API:
  // opening mounts the overlay, closing (via URL, Back button, or user click) unmounts it.
  useEffect(() => {
    if (isFlyoutOpen && !flyoutRef.current) {
      flyoutRef.current = overlays.openSystemFlyout(
        <FlyoutContent
          historyKey={historyKey}
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
          type: flyoutType,
          ownFocus: flyoutOwnFocus,
          size: mainSize,
          minWidth: FLYOUT_MIN_WIDTH,
          maxWidth: mainMaxWidth,
          resizable: true,
          onActive: mainFlyoutOnActive,
          onClose: () => {
            setIsFlyoutOpen(false);
            // flyoutRef is cleared by the effect cleanup
          },
          ['aria-labelledby']: `flyoutHeading-${title}`,
          historyKey,
        }
      );
    } else if (!isFlyoutOpen && flyoutRef.current) {
      flyoutRef.current.close();
      flyoutRef.current = null;
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 100);
    }
  }, [
    isFlyoutOpen,
    title,
    flyoutType,
    flyoutOwnFocus,
    mainSize,
    mainMaxWidth,
    childSize,
    childMaxWidth,
    overlays,
    historyKey,
    mainFlyoutOnActive,
    handleCloseFlyout,
    setIsFlyoutOpen,
  ]);

  // Unmount cleanup: prevent an orphaned overlay if the component unmounts while open.
  useEffect(() => {
    return () => {
      if (flyoutRef.current) {
        flyoutRef.current.close();
        flyoutRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              {/* Switches to control flyout options. Disabled while open: the imperative
                  overlays.openSystemFlyout API bakes these options in at open time. */}
              <FlyoutTypeSwitch
                title={title}
                flyoutType={flyoutType}
                onChange={setFlyoutType}
                disabled={isFlyoutOpen}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Switch for ownFocus behavior */}
              <FlyoutOwnFocusSwitch
                title={title}
                flyoutOwnFocus={flyoutOwnFocus}
                onChange={setFlyoutOwnFocus}
                disabled={isFlyoutOpen || flyoutType === 'push'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            buttonRef={triggerRef}
            onClick={() => setIsFlyoutOpen(true)}
            disabled={isFlyoutOpen}
            data-test-subj={`openMainFlyoutOverlaysButton-${title}`}
          >
            Open {title}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

SessionFlyout.displayName = 'SessionFlyoutFromOverlaysService';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = ({ overlays, historyKey }) => (
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
              <SessionFlyout
                historyKey={historyKey}
                title="Session X"
                mainSize="s"
                childSize="s"
                overlays={overlays}
              />
            ),
          },
          {
            title: 'Session Y: main size = m, child size = s',
            description: (
              <SessionFlyout
                historyKey={historyKey}
                title="Session Y"
                mainSize="m"
                childSize="s"
                overlays={overlays}
              />
            ),
          },
          {
            title: 'Session Z: main size = m, child size = fill',
            description: (
              <SessionFlyout
                historyKey={historyKey}
                title="Session Z"
                mainSize="m"
                childSize="fill"
                overlays={overlays}
              />
            ),
          },
        ]}
      />
    </EuiPanel>
  </>
);
