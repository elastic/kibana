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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core/public';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FlyoutTypeSwitch,
} from '../utils';
import { FlyoutOwnFocusSwitch } from '../utils/flyout_ownfocus_switch';

export interface FlyoutFromOverlaysProps {
  overlays: OverlayStart;
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
    const childDescriptionItems = createChildFlyoutDescriptionItems(
      childSize,
      childMaxWidth,
      'Overlays service'
    );

    return (
      <EuiFlyoutBody>
        <EuiText>
          <p>
            This is a child flyout opened from the flyout that was opened using the overlays
            service.
          </p>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" listItems={childDescriptionItems} />
        </EuiText>
      </EuiFlyoutBody>
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

  const FlyoutContent: React.FC = React.memo(() => {
    const mainDescriptionItems = createMainFlyoutDescriptionItems(
      flyoutType,
      flyoutOwnFocus,
      mainSize,
      mainMaxWidth,
      'openSystemFlyout'
    );

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
              This flyout uses the openSystemFlyout service with full EUI Flyout Manager
              integration.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiDescriptionList type="column" listItems={mainDescriptionItems} />
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

  const openFlyout = () => {
    flyoutRef.current = overlays.openSystemFlyout(<FlyoutContent />, {
      id: `mainFlyout-${title}`,
      title,
      type: flyoutType,
      ownFocus: flyoutOwnFocus,
      size: mainSize,
      maxWidth: mainMaxWidth,
      onActive: mainFlyoutOnActive,
      onClose: mainFlyoutOnClose,
      ['aria-labelledby']: `flyoutHeading-${title}`,
    });
    setIsFlyoutOpen(true);
  };

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <FlyoutTypeSwitch flyoutType={flyoutType} onChange={setFlyoutType} />
          <FlyoutOwnFocusSwitch flyoutOwnFocus={flyoutOwnFocus} onChange={setFlyoutOwnFocus} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={isFlyoutOpen ? handleCloseFlyout : openFlyout}>
            {isFlyoutOpen ? `Close ${title}` : `Open ${title}`}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = ({ overlays }) => {
  return (
    <>
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
      />
      <EuiText>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam scelerisque aliquam odio
          et faucibus. Nulla rhoncus feugiat eros quis consectetur. Morbi neque ex, condimentum
          dapibus congue et, vulputate ut ligula. Vestibulum sit amet urna turpis. Mauris euismod
          elit et nisi ultrices, ut faucibus orci tincidunt. Duis a quam nec dui luctus dignissim.
          Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis
          egestas. Integer convallis erat vel felis facilisis, at convallis erat elementum.
        </p>
        <p>
          Aenean ac eleifend lacus, in mollis lectus. Vivamus sodales, augue in facilisis commodo,
          odio augue ornare metus, ut fringilla augue justo vel mi. Morbi vitae diam augue. Aliquam
          vel mauris a nibh auctor commodo. Praesent et nisi eu justo eleifend convallis. Quisque
          suscipit maximus vestibulum. Phasellus congue mollis orci, sit amet luctus augue fringilla
          vel. Curabitur vitae orci nec massa volutpat posuere in sed felis. Pellentesque
          sollicitudin fringilla purus, eu pretium massa euismod eu.
        </p>
      </EuiText>
    </>
  );
};

FlyoutWithOverlays.displayName = 'FlyoutFromOverlays';
