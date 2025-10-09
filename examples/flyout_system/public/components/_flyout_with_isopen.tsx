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

interface FlyoutSessionProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  flyoutType: 'overlay' | 'push';
  childBackgroundShaded?: boolean;
}

const FlyoutSession: React.FC<FlyoutSessionProps> = React.memo((props) => {
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
      <EuiText>
        <EuiButton disabled={isFlyoutVisible} onClick={handleOpenMainFlyout}>
          Open {title}
        </EuiButton>
      </EuiText>
      <EuiFlyout
        id={`mainFlyout-${title}`}
        session={true}
        isOpen={isFlyoutVisible}
        flyoutMenuProps={{ title: `${title} - Main` }}
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
              ]}
            />
            {childSize && (
              <EuiButton onClick={handleOpenChildFlyout} disabled={isChildFlyoutVisible}>
                Open child flyout
              </EuiButton>
            )}
          </EuiText>
        </EuiFlyoutBody>
        {childSize && (
          <EuiFlyout
            id={`childFlyout-${title}`}
            isOpen={isChildFlyoutVisible}
            flyoutMenuProps={{ title: `${title} - Child` }}
            aria-labelledby="childFlyoutTitle"
            size={childSize}
            maxWidth={childMaxWidth}
            onActive={childFlyoutOnActive}
            onClose={childFlyoutOnClose}
          >
            <EuiFlyoutBody>
              <EuiText>
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
                  ]}
                />
              </EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </EuiFlyout>
    </>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

export interface FlyoutWithIsOpenProps {
  flyoutType: 'overlay' | 'push';
}

export const FlyoutWithIsOpen: React.FC<FlyoutWithIsOpenProps> = ({ flyoutType }) => {
  return (
    <EuiDescriptionList
      type="column"
      columnGutterSize="m"
      listItems={[
        {
          title: 'Session A: main size = s, child size = s',
          description: (
            <FlyoutSession flyoutType={flyoutType} title="Session A" mainSize="s" childSize="s" />
          ),
        },
        {
          title: 'Session B: main size = m, child size = s',
          description: (
            <FlyoutSession flyoutType={flyoutType} title="Session B" mainSize="m" childSize="s" />
          ),
        },
        {
          title: 'Session C: main size = s, child size = fill',
          description: (
            <FlyoutSession
              flyoutType={flyoutType}
              title="Session C"
              mainSize="s"
              childSize="fill"
            />
          ),
        },
        {
          title: 'Session D: main size = fill, child size = s',
          description: (
            <FlyoutSession
              flyoutType={flyoutType}
              title="Session D"
              mainSize="fill"
              childSize="s"
            />
          ),
        },
        {
          title: 'Session E: main size = fill',
          description: <FlyoutSession flyoutType={flyoutType} title="Session E" mainSize="fill" />,
        },
        {
          title: 'Session F: main size = s, child size = fill (maxWidth 1000px)',
          description: (
            <FlyoutSession
              flyoutType={flyoutType}
              title="Session F"
              mainSize="s"
              childSize="fill"
              childMaxWidth={1000}
            />
          ),
        },
        {
          title: 'Session G: main size = fill (maxWidth 1000px), child size = s',
          description: (
            <FlyoutSession
              flyoutType={flyoutType}
              title="Session G"
              mainSize="fill"
              mainMaxWidth={1000}
              childSize="s"
            />
          ),
        },
      ]}
    />
  );
};

FlyoutWithIsOpen.displayName = 'FlyoutWithIsOpen';
