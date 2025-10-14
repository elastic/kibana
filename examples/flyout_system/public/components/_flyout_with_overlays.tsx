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
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { OverlayRef, OverlayStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import {
  createChildFlyoutDescriptionItems,
  createMainFlyoutDescriptionItems,
  FlyoutTypeSwitch,
} from '../utils';

export interface FlyoutFromOverlaysProps {
  rendering: RenderingService;
  overlays: OverlayStart;
}

interface FlyoutSessionProps {
  title: string;
  mainSize: 's' | 'm' | 'l' | 'fill';
  mainMaxWidth?: number;
  childSize?: 's' | 'm' | 'fill';
  childMaxWidth?: number;
  overlays: OverlayStart;
  rendering: RenderingService;
}

const FlyoutSession: React.FC<FlyoutSessionProps> = React.memo((props) => {
  const { title, mainSize, childSize, mainMaxWidth, childMaxWidth, overlays, rendering } = props;

  const [flyoutType, setFlyoutType] = useState<'overlay' | 'push'>('overlay');
  const [flyoutSession, setFlyoutSession] = useState<OverlayRef | null>(null);

  // Callbacks for state synchronization
  const mainFlyoutOnActive = useCallback(() => {
    console.log('activate main flyout', title); // eslint-disable-line no-console
  }, [title]);

  const childFlyoutOnActive = useCallback(() => {
    console.log('activate child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const mainFlyoutOnClose = useCallback(() => {
    console.log('close main flyout', title); // eslint-disable-line no-console
    setFlyoutSession(null);
  }, [title]);

  const childFlyoutOnClose = useCallback(() => {
    console.log('close child flyout', title); // eslint-disable-line no-console
  }, [title]);

  const FlyoutContent: React.FC = () => {
    const [childFlyoutIsOpen, setChildFlyoutIsOpen] = useState<boolean>(false);

    const mainDescriptionItems = createMainFlyoutDescriptionItems(
      flyoutType,
      mainSize,
      mainMaxWidth,
      'Overlays service'
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
            <p>This flyout is opened using the overlays service.</p>
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
        {childSize && childFlyoutIsOpen && (
          <EuiFlyout
            aria-label="Child flyout"
            onActive={childFlyoutOnActive}
            onClose={() => {
              setChildFlyoutIsOpen(false);
              childFlyoutOnClose();
            }}
            size={childSize}
            maxWidth={childMaxWidth}
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
          </EuiFlyout>
        )}
      </>
    );
  };

  const openFlyout = () => {
    const _flyoutSession = overlays.openFlyout(toMountPoint(<FlyoutContent />, rendering), {
      session: true,
      flyoutMenuProps: {
        title: (
          <>
            {title} - <EuiCode>overlays.openFlyout()</EuiCode>
          </>
        ) as string & React.ReactElement,
      },
      type: flyoutType,
      size: mainSize,
      maxWidth: mainMaxWidth,
      onActive: mainFlyoutOnActive,
    });
    _flyoutSession.onClose.then(() => {
      mainFlyoutOnClose();
    });
    setFlyoutSession(_flyoutSession);
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <FlyoutTypeSwitch flyoutType={flyoutType} onChange={setFlyoutType} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton disabled={!!flyoutSession} onClick={openFlyout}>
          Open {title}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

FlyoutSession.displayName = 'FlyoutSession';

export const FlyoutWithOverlays: React.FC<FlyoutFromOverlaysProps> = (props) => {
  const { overlays, rendering } = props;

  return (
    <EuiDescriptionList
      type="column"
      columnGutterSize="m"
      listItems={[
        {
          title: 'Session X: main size = s, child size = s',
          description: (
            <FlyoutSession
              title="Session X"
              mainSize="s"
              childSize="s"
              overlays={overlays}
              rendering={rendering}
            />
          ),
        },
        {
          title: 'Session Y: main size = m, child size = s',
          description: (
            <FlyoutSession
              title="Session Y"
              mainSize="m"
              childSize="s"
              overlays={overlays}
              rendering={rendering}
            />
          ),
        },
        {
          title: 'Session Z: main size = fill',
          description: (
            <FlyoutSession
              title="Session Z"
              mainSize="fill"
              overlays={overlays}
              rendering={rendering}
            />
          ),
        },
      ]}
    />
  );
};

FlyoutWithOverlays.displayName = 'FlyoutFromOverlays';
