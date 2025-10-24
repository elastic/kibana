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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlayStart } from '@kbn/core/public';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FlyoutTypeSwitch,
} from '../utils';

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

const FlyoutSession: React.FC<FlyoutSessionProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [isMainFlyoutOpen, setIsMainFlyoutOpen] = useState(false);
  const flyoutRef = useRef<OverlayRef | null>(null);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutOnActive = useCallback(() => {
    console.log('activate child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setIsMainFlyoutOpen(false);
    flyoutRef.current = null;
  }, [title]);

  const childFlyoutOnClose = useCallback(() => {
    console.log('close child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const handleCloseFlyout = useCallback(() => {
    if (flyoutRef.current) {
      flyoutRef.current.close();
      setIsMainFlyoutOpen(false);
      flyoutRef.current = null;
    }
  }, []);

  const FlyoutContent: React.FC = React.memo(() => {
    const [childFlyoutIsOpen, setChildFlyoutIsOpen] = useState<boolean>(false);

    const mainDescriptionItems = createMainFlyoutDescriptionItems(
      flyoutType,
      mainSize,
      mainMaxWidth,
      'openSystemFlyout'
    );

    const childDescriptionItems = createChildFlyoutDescriptionItems(
      childSize,
      childMaxWidth,
      'Overlays service'
    );

    return (
      <>
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
            <EuiButton onClick={() => setChildFlyoutIsOpen(true)} disabled={!!childFlyoutIsOpen}>
              Open child flyout
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
        {childSize && childFlyoutIsOpen && (
          <EuiFlyout
            id={`childFlyout-${title}`}
            aria-labelledby="childFlyoutTitle"
            size={childSize}
            maxWidth={childMaxWidth}
            onActive={childFlyoutOnActive}
            onClose={() => {
              setChildFlyoutIsOpen(false);
              childFlyoutOnClose();
            }}
            flyoutMenuProps={{
              title: `Child flyout from ${title}`,
              titleId: 'childFlyoutTitle',
            }}
          >
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
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    aria-label="Close"
                    onClick={() => {
                      setChildFlyoutIsOpen(false);
                      childFlyoutOnClose();
                    }}
                  >
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

  const openFlyout = () => {
    flyoutRef.current = overlays.openSystemFlyout(<FlyoutContent />, {
      id: `mainFlyout-${title}`,
      title,
      type: flyoutType,
      ownFocus: false,
      size: mainSize,
      maxWidth: mainMaxWidth,
      onActive: mainFlyoutOnActive,
      onClose: mainFlyoutOnClose,
    });

    setIsMainFlyoutOpen(true);
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <FlyoutTypeSwitch flyoutType={flyoutType} onChange={setFlyoutType} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton disabled={isMainFlyoutOpen} onClick={openFlyout}>
          Open {title}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = ({ overlays }) => {
  return (
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
  );
};

FlyoutWithOverlays.displayName = 'FlyoutFromOverlays';
