/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';

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

interface FlyoutSessionFromComponents {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
}

const FlyoutSessionFromComponents: React.FC<FlyoutSessionFromComponents> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isChildFlyoutVisible, setIsChildFlyoutVisible] = useState(false);

  // Handlers for "Open" buttons

  const handleOpenMainFlyout = () => {
    setIsFlyoutVisible(true);
  };

  const handleOpenChildFlyout = () => {
    setIsChildFlyoutVisible(true);
  };

  // Callbacks for state synchronization

  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutOnActive = useCallback(() => {
    console.log('activate child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setIsFlyoutVisible(false);
    setIsChildFlyoutVisible(false);
  }, [title]);

  const childFlyoutOnClose = useCallback(() => {
    console.log('close child flyout', title); // eslint-disable-line no-console
    setIsChildFlyoutVisible(false);
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
            <EuiButton disabled={isFlyoutVisible} onClick={handleOpenMainFlyout}>
              Open {title}
            </EuiButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutVisible && (
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
          onClose={mainFlyoutOnClose}
          flyoutMenuProps={{ title }}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiText>
              <h2 id="sessionFlyoutTitle">{title}</h2>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                This flyout is rendered using <EuiCode>EuiFlyout</EuiCode> directly.
              </p>
              <p>This is the content of {title}.</p>
              <EuiSpacer size="s" />
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
              {childSize && (
                <EuiButton onClick={handleOpenChildFlyout} disabled={isChildFlyoutVisible}>
                  Open child Flyout
                </EuiButton>
              )}
            </EuiText>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={mainFlyoutOnClose} aria-label="Close">
                  Close
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
          {childSize && isChildFlyoutVisible && (
            <EuiFlyout
              id={`childFlyout-${title}`}
              aria-labelledby="childFlyoutTitle"
              size={childSize}
              maxWidth={childMaxWidth}
              onActive={childFlyoutOnActive}
              onClose={childFlyoutOnClose}
              flyoutMenuProps={{
                title: `${title} - Child`,
                titleId: 'childFlyoutTitle',
              }}
            >
              <EuiFlyoutBody>
                <EuiText>
                  <p>This is a child flyout.</p>
                  <EuiSpacer size="s" />
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
                </EuiText>
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={childFlyoutOnClose} aria-label="Close">
                      Close
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </EuiFlyout>
          )}
        </EuiFlyout>
      )}
    </>
  );
});

FlyoutSessionFromComponents.displayName = 'FlyoutSessionFromComponents';

const NonSessionFlyout: React.FC = () => {
  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutOwnFocus, setFlyoutOwnFocus] = useState<boolean>(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

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
            <EuiButton disabled={isFlyoutVisible} onClick={handleOpenFlyout}>
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
};

export const FlyoutWithComponent: React.FC = () => {
  return (
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
          columnGutterSize="m"
          listItems={[
            {
              title: 'Session J: main size = s, child size = s',
              description: (
                <FlyoutSessionFromComponents title="Session J" mainSize="s" childSize="s" />
              ),
            },
            {
              title: 'Session K: main size = m, child size = s',
              description: (
                <FlyoutSessionFromComponents title="Session K" mainSize="m" childSize="s" />
              ),
            },
            {
              title: 'Session L: main size = fill',
              description: <FlyoutSessionFromComponents title="Session L" mainSize="fill" />,
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
            With <EuiCode>{'session="never"'}</EuiCode>
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          type="column"
          columnGutterSize="m"
          listItems={[
            {
              title: 'Non-session flyout: size = m',
              description: <NonSessionFlyout />,
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

FlyoutWithComponent.displayName = 'FlyoutFromComponents';
