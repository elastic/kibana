/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';

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
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

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
          <EuiSwitch
            label="Push"
            checked={flyoutType === 'push'}
            onChange={(e) => setFlyoutType(e.target.checked ? 'push' : 'overlay')}
          />
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
          ownFocus={false}
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
                listItems={[
                  { title: 'Flyout type', description: flyoutType },
                  { title: 'Main flyout size', description: mainSize },
                  {
                    title: 'Main flyout maxWidth',
                    description: mainMaxWidth ?? 'N/A',
                  },
                  {
                    title: 'Rendering method',
                    description: 'EuiFlyout component',
                  },
                ]}
              />
              {childSize && (
                <EuiButton onClick={handleOpenChildFlyout} disabled={isChildFlyoutVisible}>
                  Open child flyout
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
                    listItems={[
                      {
                        title: 'Child flyout size',
                        description: childSize ?? 'N/A',
                      },
                      {
                        title: 'Child flyout maxWidth',
                        description: childMaxWidth ?? 'N/A',
                      },
                      {
                        title: 'Rendering method',
                        description: 'EuiFlyout component',
                      },
                    ]}
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
          <EuiSwitch
            label="Push"
            checked={flyoutType === 'push'}
            onChange={(e) => setFlyoutType(e.target.checked ? 'push' : 'overlay')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiButton disabled={isFlyoutVisible} onClick={handleOpenFlyout}>
              Open non-session flyout
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
          size="s"
          side="left"
          ownFocus={false}
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
    <EuiDescriptionList
      type="column"
      columnGutterSize="m"
      listItems={[
        {
          title: 'Session J: main size = s, child size = s',
          description: <FlyoutSessionFromComponents title="Session J" mainSize="s" childSize="s" />,
        },
        {
          title: 'Session K: main size = m, child size = s',
          description: <FlyoutSessionFromComponents title="Session K" mainSize="m" childSize="s" />,
        },
        {
          title: 'Session L: main size = fill',
          description: <FlyoutSessionFromComponents title="Session L" mainSize="fill" />,
        },
        {
          title: 'Non-session flyout',
          description: <NonSessionFlyout />,
        },
      ]}
    />
  );
};

FlyoutWithComponent.displayName = 'FlyoutFromComponents';
