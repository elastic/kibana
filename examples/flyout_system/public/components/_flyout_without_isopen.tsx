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
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

interface FlyoutSessionWithoutIsOpenProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  flyoutType: 'overlay' | 'push';
  childBackgroundShaded?: boolean;
}

const FlyoutSessionWithoutIsOpen: React.FC<FlyoutSessionWithoutIsOpenProps> = React.memo(
  (props) => {
    const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, flyoutType } = props;

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
      console.log('activate main flyout (without isOpen)', title); // eslint-disable-line no-console
    }, [title]);

    const childFlyoutOnActive = useCallback(() => {
      console.log('activate child flyout (without isOpen)', title); // eslint-disable-line no-console
    }, [title]);

    const mainFlyoutOnClose = useCallback(() => {
      console.log('close main flyout (without isOpen)', title); // eslint-disable-line no-console
      setIsFlyoutVisible(false);
      setIsChildFlyoutVisible(false);
    }, [title]);

    const childFlyoutOnClose = useCallback(() => {
      console.log('close child flyout (without isOpen)', title); // eslint-disable-line no-console
      setIsChildFlyoutVisible(false);
    }, [title]);

    // Render

    return (
      <>
        <EuiText>
          <EuiButton disabled={isFlyoutVisible} onClick={handleOpenMainFlyout}>
            Open {title}
          </EuiButton>
        </EuiText>
        {isFlyoutVisible && (
          <EuiFlyout
            id={`mainFlyout-${title}`}
            session={true}
            flyoutMenuProps={{ title: `${title} - Main (without isOpen)` }}
            aria-labelledby="flyoutTitle"
            size={mainSize}
            maxWidth={mainMaxWidth}
            type={flyoutType}
            ownFocus={false}
            pushAnimation={true}
            onActive={mainFlyoutOnActive}
            onClose={mainFlyoutOnClose}
          >
            <EuiFlyoutBody>
              <EuiText>
                <p>
                  This flyout is rendered without the isOpen prop - using conditional rendering
                  instead.
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
                      description: 'Conditional rendering (no isOpen prop)',
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
            {childSize && isChildFlyoutVisible && (
              <EuiFlyout
                id={`childFlyout-${title}`}
                flyoutMenuProps={{ title: `${title} - Child (without isOpen)` }}
                aria-labelledby="childFlyoutTitle"
                size={childSize}
                maxWidth={childMaxWidth}
                onActive={childFlyoutOnActive}
                onClose={childFlyoutOnClose}
              >
                <EuiFlyoutBody>
                  <EuiText>
                    <p>This child flyout is also rendered conditionally without the isOpen prop.</p>
                    <p>This is the content of the child flyout of {title}.</p>
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
                          description: 'Conditional rendering (no isOpen prop)',
                        },
                      ]}
                    />
                  </EuiText>
                </EuiFlyoutBody>
              </EuiFlyout>
            )}
          </EuiFlyout>
        )}
      </>
    );
  }
);

FlyoutSessionWithoutIsOpen.displayName = 'FlyoutSessionWithoutIsOpen';

export interface FlyoutWithoutIsOpenProps {
  flyoutType: 'overlay' | 'push';
}

export const FlyoutWithoutIsOpen: React.FC<FlyoutWithoutIsOpenProps> = ({ flyoutType }) => {
  return (
    <EuiDescriptionList
      type="column"
      columnGutterSize="m"
      listItems={[
        {
          title: 'Session X: main size = s, child size = s (conditional rendering)',
          description: (
            <FlyoutSessionWithoutIsOpen
              flyoutType={flyoutType}
              title="Session X"
              mainSize="s"
              childSize="s"
            />
          ),
        },
        {
          title: 'Session Y: main size = m, child size = s (conditional rendering)',
          description: (
            <FlyoutSessionWithoutIsOpen
              flyoutType={flyoutType}
              title="Session Y"
              mainSize="m"
              childSize="s"
            />
          ),
        },
        {
          title: 'Session Z: main size = fill (conditional rendering)',
          description: (
            <FlyoutSessionWithoutIsOpen flyoutType={flyoutType} title="Session Z" mainSize="fill" />
          ),
        },
      ]}
    />
  );
};

FlyoutWithoutIsOpen.displayName = 'FlyoutWithoutIsOpen';
