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
import type { OverlayStart } from '@kbn/core/public';
import { useFlyoutTemplate } from '@kbn/flyout-template-overlay';
import type { UseFlyoutTemplateResult } from '@kbn/flyout-template-overlay';
import { useBooleanUrlState } from '@kbn/shared-url-state';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FLYOUT_MIN_WIDTH,
  FlyoutOwnFocusSwitch,
  FlyoutTypeSwitch,
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
  const childTriggerARef = useRef<HTMLButtonElement>(null);
  const childTriggerBRef = useRef<HTMLButtonElement>(null);

  const childFlyoutA = useFlyoutTemplate(overlays, { returnFocusTo: childTriggerARef });
  const childFlyoutB = useFlyoutTemplate(overlays, { returnFocusTo: childTriggerBRef });

  const openChildFlyout = (flyout: UseFlyoutTemplateResult, label: 'A' | 'B', id: string) => () => {
    flyout.open(
      {
        id,
        session: 'inherit',
        historyKey,
        size: childSize,
        hasChildBackground: true,
        maxWidth: childMaxWidth,
        minWidth: FLYOUT_MIN_WIDTH,
        onActive: () => {
          console.log(`activate child flyout ${label}`, title); // eslint-disable-line no-console
        },
        onClose: () => {
          console.log(`close child flyout ${label}`, title); // eslint-disable-line no-console
        },
      },
      (T) => (
        <>
          <T.Header title={`Child flyout ${label} of ${title}`} collapsed />
          <T.Body>
            <ChildFlyoutContent childSize={childSize} childMaxWidth={childMaxWidth} />
          </T.Body>
        </>
      )
    );
  };

  return (
    <>
      <EuiButton
        buttonRef={childTriggerARef}
        onClick={
          childFlyoutA.isOpen
            ? childFlyoutA.close
            : openChildFlyout(childFlyoutA, 'A', `childFlyout-${title}`)
        }
        data-test-subj={`openChildFlyoutAOverlaysButton-${title}`}
      >
        {childFlyoutA.isOpen ? 'Close child flyout A' : 'Open child flyout A'}
      </EuiButton>{' '}
      <EuiButton
        buttonRef={childTriggerBRef}
        onClick={
          childFlyoutB.isOpen
            ? childFlyoutB.close
            : openChildFlyout(childFlyoutB, 'B', `childFlyout-${title}-B`)
        }
        data-test-subj={`openChildFlyoutBOverlaysButton-${title}`}
      >
        {childFlyoutB.isOpen ? 'Close child flyout B' : 'Open child flyout B'}
      </EuiButton>
    </>
  );
};

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays, historyKey } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useBooleanUrlState(
    `flyoutOverlays_${title.replace(/\s+/g, '')}Open`
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyout = useFlyoutTemplate(overlays, { returnFocusTo: triggerRef });

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
  }, [setIsFlyoutOpen]);

  // Bridge URL-backed open state to the imperative overlays.openFlyoutTemplate API:
  // opening mounts the overlay, closing (via URL, Back button, or user click) unmounts it.
  useEffect(() => {
    if (isFlyoutOpen && !flyout.isOpen) {
      flyout.open(
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
          },
          historyKey,
        },
        (T) => (
          <>
            <T.Header
              title={title}
              description={
                <>
                  Opened with <EuiCode>openFlyoutTemplate</EuiCode>
                </>
              }
            />
            <T.Body>
              <T.Body.Section title="Flyout properties">
                <FlyoutProperties
                  flyoutType={flyoutType}
                  flyoutOwnFocus={flyoutOwnFocus}
                  mainSize={mainSize}
                  mainMaxWidth={mainMaxWidth}
                />
              </T.Body.Section>
              <FillerContent />
              <T.Body.Section title="Child flyouts">
                <ChildFlyoutTriggers
                  historyKey={historyKey}
                  title={title}
                  childSize={childSize}
                  childMaxWidth={childMaxWidth}
                  overlays={overlays}
                />
              </T.Body.Section>
            </T.Body>
            <T.Footer>
              <T.Footer.SecondaryAction
                label="Close"
                onClick={handleCloseFlyout}
                data-test-subj={`closeMainFlyoutOverlaysButton-${title}`}
              />
            </T.Footer>
          </>
        )
      );
    } else if (!isFlyoutOpen && flyout.isOpen) {
      flyout.close();
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
    flyout,
  ]);

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
