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
import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FlyoutOwnFocusSwitch,
  FlyoutTypeSwitch,
} from '../utils';

interface SessionFlyoutProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
}

const SessionFlyout: React.FC<SessionFlyoutProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [isChildFlyoutAOpen, setIsChildFlyoutAOpen] = useState(false);
  const [isChildFlyoutBOpen, setIsChildFlyoutBOpen] = useState(false);

  // Refs for manual focus management
  const mainTriggerRef = useRef<HTMLButtonElement>(null);
  const childTriggerARef = useRef<HTMLButtonElement>(null);
  const childTriggerBRef = useRef<HTMLButtonElement>(null);

  // Handlers for "Open" buttons

  const handleOpenMainFlyout = () => {
    setIsFlyoutOpen(true);
  };

  const handleOpenChildFlyoutA = () => {
    setIsChildFlyoutAOpen(true);
    setIsChildFlyoutBOpen(false);
  };

  const handleOpenChildFlyoutB = () => {
    setIsChildFlyoutBOpen(true);
    setIsChildFlyoutAOpen(false);
  };

  // Callbacks for state synchronization

  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutAOnActive = useCallback(() => {
    console.log('activate child flyout A', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setIsFlyoutOpen(false);
    setIsChildFlyoutAOpen(false);
    setIsChildFlyoutBOpen(false);

    // Return focus to main trigger button after closing main flyout
    // TODO: clean this up if EUI adds internal support for returning focus to the trigger element on close
    // https://github.com/elastic/eui/issues/9365
    setTimeout(() => {
      mainTriggerRef.current?.focus();
    }, 100);
  }, [title]);

  const handleCloseChildFlyoutA = useCallback(() => {
    console.log('close child flyout A', title); // eslint-disable-line no-console
    setIsChildFlyoutAOpen(false);

    // Return focus to child trigger button after closing child flyout A
    setTimeout(() => {
      childTriggerARef.current?.focus();
    }, 100);
  }, [title]);

  const handleCloseChildFlyoutB = useCallback(() => {
    console.log('close child flyout B', title); // eslint-disable-line no-console
    setIsChildFlyoutBOpen(false);

    // Return focus to child trigger button after closing child flyout B
    setTimeout(() => {
      childTriggerBRef.current?.focus();
    }, 100);
  }, [title]);

  // Render

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
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
          <EuiText>
            <EuiButton
              buttonRef={mainTriggerRef}
              disabled={isFlyoutOpen}
              onClick={handleOpenMainFlyout}
            >
              Open {title}
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && (
        <EuiFlyout
          id={`mainFlyout-${title}`}
          session="start"
          aria-labelledby="sessionFlyoutTitle"
          size={mainSize}
          maxWidth={mainMaxWidth}
          type={flyoutType}
          ownFocus={flyoutOwnFocus}
          pushAnimation={true}
          onActive={mainFlyoutOnActive}
          onClose={handleCloseFlyout}
          flyoutMenuProps={{ title }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2 id="sessionFlyoutTitle">
                Flyout with <EuiCode>EuiFlyout</EuiCode>: {title}
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
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
            <EuiSpacer size="m" />
            <EuiText>
              <p>
                Below is some filler content to demonstrate scrolling behavior.
                {childSize && (
                  <>
                    {' '}
                    Scroll down to see the button to <strong>open the child flyout</strong>.
                  </>
                )}
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar
                facilisis justo mollis, auctor consequat urna. Morbi a bibendum metus. Donec
                scelerisque sollicitudin enim eu venenatis. Duis tincidunt laoreet ex, in pretium
                orci vestibulum eget. Class aptent taciti sociosqu ad litora torquent per conubia
                nostra, per inceptos himenaeos. Duis pharetra luctus lacus ut vestibulum. Maecenas
                ipsum lacus, lacinia quis posuere ut, pulvinar vitae dolor. Integer eu nibh at nisi
                ullamcorper sagittis id vel leo. Integer feugiat faucibus libero, at maximus nisl
                suscipit posuere. Morbi nec enim nunc. Phasellus bibendum turpis ut ipsum egestas,
                sed sollicitudin elit convallis. Cras pharetra mi tristique sapien vestibulum
                lobortis. Nam eget bibendum metus, non dictum mauris. Nulla at tellus sagittis,
                viverra est a, bibendum metus.
              </p>
              <p>
                Sed non neque elit. Sed ut imperdiet nisi. Proin condimentum fermentum nunc. Etiam
                pharetra, erat sed fermentum feugiat, velit mauris egestas quam, ut aliquam massa
                nisl quis neque. Suspendisse in orci enim.
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque nisl eros, pulvinar
                facilisis justo mollis, auctor consequat urna. Morbi a bibendum metus. Donec
                scelerisque sollicitudin enim eu venenatis. Duis tincidunt laoreet ex, in pretium
                orci vestibulum eget. Class aptent taciti sociosqu ad litora torquent per conubia
                nostra, per inceptos himenaeos. Duis pharetra luctus lacus ut vestibulum. Maecenas
                ipsum lacus, lacinia quis posuere ut, pulvinar vitae dolor. Integer eu nibh at nisi
                ullamcorper sagittis id vel leo. Integer feugiat faucibus libero, at maximus nisl
                suscipit posuere. Morbi nec enim nunc. Phasellus bibendum turpis ut ipsum egestas,
                sed sollicitudin elit convallis. Cras pharetra mi tristique sapien vestibulum
                lobortis. Nam eget bibendum metus, non dictum mauris. Nulla at tellus sagittis,
                viverra est a, bibendum metus.
              </p>
            </EuiText>
            {childSize && (
              <>
                <EuiSpacer size="m" />
                <EuiButton
                  buttonRef={childTriggerARef}
                  onClick={handleOpenChildFlyoutA}
                  disabled={isChildFlyoutAOpen}
                >
                  Open child flyout A
                </EuiButton>{' '}
                <EuiButton
                  buttonRef={childTriggerBRef}
                  onClick={handleOpenChildFlyoutB}
                  disabled={isChildFlyoutBOpen}
                >
                  Open child flyout B
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
        </EuiFlyout>
      )}
      {isChildFlyoutAOpen && (
        <EuiFlyout
          id={`childFlyout-${title}-a`}
          session="inherit"
          aria-labelledby="childFlyoutATitle"
          size={childSize}
          maxWidth={childMaxWidth}
          onActive={childFlyoutAOnActive}
          onClose={handleCloseChildFlyoutA}
          flyoutMenuProps={{
            title: `${title} - Child A`,
            titleId: 'childFlyoutATitle',
          }}
        >
          <EuiFlyoutBody>
            <EuiText>
              <p>This is child flyout A.</p>
              <EuiSpacer size="m" />
            </EuiText>
            <EuiDescriptionList
              type="column"
              listItems={createChildFlyoutDescriptionItems(
                childSize,
                childMaxWidth,
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleCloseChildFlyoutA} aria-label="Close">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
      {isChildFlyoutBOpen && (
        <EuiFlyout
          id={`childFlyout-${title}-a`}
          session="inherit"
          aria-labelledby="childFlyoutBTitle"
          size={childSize}
          maxWidth={childMaxWidth}
          onActive={childFlyoutAOnActive}
          onClose={handleCloseChildFlyoutB}
          flyoutMenuProps={{
            title: `${title} - Child B`,
            titleId: 'childFlyoutBTitle',
          }}
        >
          <EuiFlyoutBody>
            <EuiText>
              <p>This is child flyout B.</p>
              <EuiSpacer size="m" />
            </EuiText>
            <EuiDescriptionList
              type="column"
              listItems={createChildFlyoutDescriptionItems(
                childSize,
                childMaxWidth,
                <>
                  <EuiCode>EuiFlyout</EuiCode> component
                </>
              )}
            />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleCloseChildFlyoutB} aria-label="Close">
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

SessionFlyout.displayName = 'SessionFlyoutFromComponents';

const NonSessionFlyout: React.FC = React.memo(() => {
  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
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
          <EuiText>
            <EuiButton buttonRef={triggerRef} disabled={isFlyoutVisible} onClick={handleOpenFlyout}>
              Open Non-session Flyout
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutVisible && (
        <EuiFlyout
          aria-labelledby="nonSessionFlyoutTitle"
          onActive={flyoutOnActive}
          onClose={flyoutOnClose}
          type={flyoutType}
          size="m"
          ownFocus={flyoutOwnFocus}
          session="never"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiText>
              <h2 id="nonSessionFlyoutTitle">Non-session flyout</h2>
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

NonSessionFlyout.displayName = 'NonSessionFlyoutFromComponents';

export const FlyoutWithComponent: React.FC = () => (
  <>
    <EuiTitle>
      <h2>
        Flyouts with <EuiCode>EuiFlyout</EuiCode>
      </h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          With <EuiCode>{'session="start"'}</EuiCode>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        type="column"
        listItems={[
          {
            title: 'Session J: main size = s, child size = s',
            description: <SessionFlyout title="Session J" mainSize="s" childSize="s" />,
          },
          {
            title: 'Session K: main size = m, child size = s',
            description: <SessionFlyout title="Session K" mainSize="m" childSize="s" />,
          },
          {
            title: 'Session L: main size = fill',
            description: <SessionFlyout title="Session L" mainSize="fill" />,
          },
        ]}
      />

      <EuiSpacer size="m" />

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
            title: 'Non-session flyout: size = m',
            description: <NonSessionFlyout />,
          },
        ]}
      />
    </EuiPanel>
  </>
);
