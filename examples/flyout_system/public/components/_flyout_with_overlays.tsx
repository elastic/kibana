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
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { useBooleanUrlState } from '@kbn/shared-url-state';
import { FlyoutTemplate } from '@kbn/flyout-template';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FLYOUT_MIN_WIDTH,
  FlyoutOwnFocusSwitch,
  headerBlocks,
  FlyoutTypeSwitch,
  returnFocusToTrigger,
} from '../utils';

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

/** The child flyout's single body item; no `EuiFlyoutBody` wrapper needed. */
const ChildFlyoutContent: React.FC<Pick<SessionFlyoutProps, 'childSize' | 'childMaxWidth'>> =
  React.memo(({ childSize, childMaxWidth }) => (
    <>
      <EuiText>
        <p>
          This is a child flyout opened from the flyout that was opened using the{' '}
          <EuiCode>openFlyoutTemplate</EuiCode> method.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type="column"
        listItems={createChildFlyoutDescriptionItems(
          childSize,
          childMaxWidth,
          <EuiCode>openFlyoutTemplate</EuiCode>
        )}
      />
    </>
  ));

interface FlyoutPropertiesProps {
  flyoutType: 'overlay' | 'push';
  flyoutOwnFocus: boolean;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
}

/** The main flyout's first body section: a description list of the current widget options. */
const FlyoutProperties: React.FC<FlyoutPropertiesProps> = React.memo(
  ({ flyoutType, flyoutOwnFocus, mainSize, mainMaxWidth }) => (
    <EuiDescriptionList
      type="column"
      listItems={createMainFlyoutDescriptionItems(
        flyoutType,
        flyoutOwnFocus,
        mainSize,
        mainMaxWidth,
        <EuiCode>openFlyoutTemplate</EuiCode>
      )}
    />
  )
);

/** Filler content between the two sections, long enough to demonstrate header-collapse-on-scroll. */
const FillerContent: React.FC = () => (
  <EuiText>
    <p>
      Below is some filler content to demonstrate scrolling behavior. Scroll down to access the
      button to <strong>open the child flyout</strong>.
    </p>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
      labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
      laboris nisi ut aliquip ex ea commodo consequat.
    </p>
    <p>
      Sed vel lacus id magna laoreet aliquam. Praesent aliquam in tellus eu pellentesque. Nulla
      facilisi. Sed pulvinar, massa vitae interdum pulvinar, risus lectus porta nunc, vel efficitur
      turpis odio nec nisi. Donec nec justo eget felis facilisis fermentum. Aliquam porttitor mauris
      sit amet orci. Aenean dignissim pellentesque felis, non volutpat arcu. Morbi a enim in magna
      semper bibendum. Etiam scelerisque, nunc ac egestas consequat, odio nibh euismod nulla, eget
      auctor orci nibh vel nisi. Aliquam erat volutpat. Mauris vel neque sit amet nunc gravida
      congue sed sit amet purus. Quisque lacus quam, egestas ac tincidunt a, lacinia vel velit.
      Aenean facilisis nulla vitae urna tincidunt congue sed ut dui. Morbi malesuada nulla nec purus
      convallis consequat. Vivamus id mollis quam. Morbi ac commodo nulla.
    </p>
  </EuiText>
);

/** Render all testable components in the first tab so they are immediately reachable. */
const BODY_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

interface ChildFlyoutTriggersProps {
  historyKey: symbol;
  title: string;
  childSize: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  overlays: OverlayStart;
}

/**
 * The two child-flyout trigger buttons, and everything that drives them. This subtree owns its
 * own open/closed state, so clicking a trigger re-renders it without re-rendering the main
 * flyout's chrome.
 */
const ChildFlyoutTriggers: React.FC<ChildFlyoutTriggersProps> = ({
  historyKey,
  title,
  childSize,
  childMaxWidth,
  overlays,
}) => {
  const titleKey = title.replace(/\s+/g, '');
  const childTriggerARef = useRef<HTMLButtonElement>(null);
  const childTriggerBRef = useRef<HTMLButtonElement>(null);

  const overlayARef = useRef<OverlayRef | null>(null);
  const overlayBRef = useRef<OverlayRef | null>(null);
  const [isChildAOpen, setIsChildAOpen] = useState(false);
  const [isChildBOpen, setIsChildBOpen] = useState(false);

  const openChildFlyout = (
    overlayRef: React.MutableRefObject<OverlayRef | null>,
    setIsOpen: (v: boolean) => void,
    returnFocusRef: React.RefObject<HTMLButtonElement>,
    label: 'A' | 'B',
    id: string
  ) => {
    overlayRef.current = overlays.openFlyoutTemplate(
      {
        id,
        session: 'inherit',
        historyKey,
        size: childSize,
        hasChildBackground: true,
        maxWidth: childMaxWidth,
        minWidth: FLYOUT_MIN_WIDTH,
        'data-test-subj': `flyoutOverlays${titleKey}Child${label}`,
        onActive: () => {
          console.log(`activate child flyout ${label}`, title); // eslint-disable-line no-console
        },
        onClose: () => {
          overlayRef.current = null;
          setIsOpen(false);
          returnFocusRef.current?.focus();
        },
      },
      ({ onClose }) => (
        <FlyoutTemplate onClose={onClose}>
          <FlyoutTemplate.Header title={`Child flyout ${label} of ${title}`} collapsed />
          <FlyoutTemplate.Body>
            <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )
    );
    setIsOpen(true);
  };

  const closeChildFlyout = (
    overlayRef: React.MutableRefObject<OverlayRef | null>,
    setIsOpen: (v: boolean) => void,
    returnFocusRef: React.RefObject<HTMLButtonElement>
  ) => {
    overlayRef.current?.close();
    overlayRef.current = null;
    setIsOpen(false);
    returnFocusRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      overlayARef.current?.close();
      overlayBRef.current?.close();
      overlayARef.current = null;
      overlayBRef.current = null;
    };
  }, []);

  return (
    <>
      <EuiButton
        buttonRef={childTriggerARef}
        onClick={
          isChildAOpen
            ? () => closeChildFlyout(overlayARef, setIsChildAOpen, childTriggerARef)
            : () =>
                openChildFlyout(
                  overlayARef,
                  setIsChildAOpen,
                  childTriggerARef,
                  'A',
                  `childFlyout-${title}`
                )
        }
        data-test-subj={`openChildFlyoutAOverlaysButton-${title}`}
      >
        {isChildAOpen ? 'Close child flyout A' : 'Open child flyout A'}
      </EuiButton>{' '}
      <EuiButton
        buttonRef={childTriggerBRef}
        onClick={
          isChildBOpen
            ? () => closeChildFlyout(overlayBRef, setIsChildBOpen, childTriggerBRef)
            : () =>
                openChildFlyout(
                  overlayBRef,
                  setIsChildBOpen,
                  childTriggerBRef,
                  'B',
                  `childFlyout-${title}-B`
                )
        }
        data-test-subj={`openChildFlyoutBOverlaysButton-${title}`}
      >
        {isChildBOpen ? 'Close child flyout B' : 'Open child flyout B'}
      </EuiButton>
    </>
  );
};

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays, historyKey } = props;
  // Create a selector-safe string for use in test subjects
  const titleKey = title.replace(/\s+/g, '');

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useBooleanUrlState(
    `flyoutOverlays_${title.replace(/\s+/g, '')}Open`
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<OverlayRef | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, [setIsFlyoutOpen]);

  const handleSave = useCallback(() => {
    console.log('save main flyout', title); // eslint-disable-line no-console
  }, [title]);

  // Bridge URL-backed open state to the imperative overlays.openFlyoutTemplate API.
  useEffect(() => {
    if (isFlyoutOpen && !isOpen) {
      overlayRef.current = overlays.openFlyoutTemplate(
        {
          id: `mainFlyout-${title}`,
          type: flyoutType,
          ownFocus: flyoutOwnFocus,
          size: mainSize,
          minWidth: FLYOUT_MIN_WIDTH,
          maxWidth: mainMaxWidth,
          resizable: true,
          onActive: mainFlyoutOnActive,
          'data-test-subj': `flyoutOverlays${titleKey}`,
          tabs: BODY_TABS,
          onClose: () => {
            overlayRef.current = null;
            setIsOpen(false);
            setIsFlyoutOpen(false);
            returnFocusToTrigger(triggerRef);
          },
          historyKey,
        },
        ({ onClose }) => (
          <FlyoutTemplate onClose={onClose}>
            <FlyoutTemplate.Header
              title={title}
              description={
                <>
                  Opened with <EuiCode>openFlyoutTemplate</EuiCode>
                </>
              }
            >
              {headerBlocks()}
            </FlyoutTemplate.Header>
            <FlyoutTemplate.Body>
              {/* Put all interactive parts in the first tab to simplify tests. */}
              <FlyoutTemplate.Body.TabPanel tabId="overview">
                <FlyoutTemplate.Body.Accordion
                  id="properties"
                  title="Flyout properties"
                  initialIsOpen
                >
                  <FlyoutProperties
                    flyoutType={flyoutType}
                    flyoutOwnFocus={flyoutOwnFocus}
                    mainSize={mainSize}
                    mainMaxWidth={mainMaxWidth}
                  />
                </FlyoutTemplate.Body.Accordion>
                <FlyoutTemplate.Body.Accordion id="details" title="Details">
                  <FlyoutTemplate.Body.Accordion.Subsection id="host" title="Host">
                    <EuiText size="s">
                      <p>A subsection adds a second level of titling inside an accordion.</p>
                    </EuiText>
                  </FlyoutTemplate.Body.Accordion.Subsection>
                  <FlyoutTemplate.Body.Accordion.Subsection id="service" title="Service">
                    <EuiText size="s">
                      <p>Under an accordion, every subsection is bordered.</p>
                    </EuiText>
                  </FlyoutTemplate.Body.Accordion.Subsection>
                </FlyoutTemplate.Body.Accordion>
                <FlyoutTemplate.Body.Accordion
                  id="childFlyouts"
                  title="Child flyouts"
                  initialIsOpen
                >
                  <ChildFlyoutTriggers
                    historyKey={historyKey}
                    title={title}
                    childSize={childSize}
                    childMaxWidth={childMaxWidth}
                    overlays={overlays}
                  />
                </FlyoutTemplate.Body.Accordion>
              </FlyoutTemplate.Body.TabPanel>
              <FlyoutTemplate.Body.TabPanel tabId="activity">
                <FillerContent />
              </FlyoutTemplate.Body.TabPanel>
              <FlyoutTemplate.Body.TabPanel tabId="settings">
                <EuiText size="s">
                  <p>Nothing to configure in this example.</p>
                </EuiText>
              </FlyoutTemplate.Body.TabPanel>
            </FlyoutTemplate.Body>
            <FlyoutTemplate.Footer>
              <FlyoutTemplate.Footer.SecondaryAction
                label="Close"
                onClick={handleCloseFlyout}
                data-test-subj={`closeMainFlyoutOverlaysButton-${title}`}
              />
              <FlyoutTemplate.Footer.PrimaryAction
                label="Save"
                onClick={handleSave}
                data-test-subj={`saveMainFlyoutOverlaysButton-${title}`}
              />
            </FlyoutTemplate.Footer>
          </FlyoutTemplate>
        )
      );
      setIsOpen(true);
    } else if (!isFlyoutOpen && isOpen) {
      overlayRef.current?.close();
      overlayRef.current = null;
      setIsOpen(false);
      returnFocusToTrigger(triggerRef);
    }
  }, [
    isFlyoutOpen,
    isOpen,
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
    handleSave,
    setIsFlyoutOpen,
    titleKey,
  ]);

  // The overlay renders into core's DOM target, outside this app's React root, so unmounting
  // while open would leave it on screen with nothing left to dismiss it.
  useEffect(() => {
    return () => {
      overlayRef.current?.close();
      overlayRef.current = null;
    };
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              {/* Switches to control flyout options. Disabled while open: the imperative
                  overlays.openFlyoutTemplate API bakes these options in at open time. */}
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
    <EuiTitle size="s">
      <h2>
        <EuiCode>core.overlays.openFlyoutTemplate</EuiCode>
      </h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiPanel>
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
