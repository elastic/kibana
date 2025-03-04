/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useRef } from 'react';
import { JourneyFlyoutApi, JourneyFlyoutProps } from '../journey_flyouts/types';
import { JourneyFlyout } from '../journey_flyouts/journey_flyout';

const FlyoutOne: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Main flyout one</h2>
        this is some other text. To see more text, continue to flyout 2.
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutTwo, width: 800 })}>
        Open flyout 2
      </EuiButton>
    </>
  );
};

const FlyoutTwo: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>A second main flyout</h2>
        Well what do we have here, a second flyout on top of the first one?
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutThree, width: 800 })}>
        Go to flyout 3
      </EuiButton>
    </>
  );
};

const FlyoutThree: React.FC<JourneyFlyoutProps> = ({ openNextFlyout, openChildFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Main flyout number three</h2>
        This flyout is a little more complicated. It can spawn two different detail flyouts.
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiButton onClick={() => openNextFlyout({ Component: FlyoutFour, width: 800 })}>
            Open another main flyout
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            onClick={() => openChildFlyout({ Component: FlyoutThreeChildOne, width: 800 })}
          >
            Open a detail flyout
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            onClick={() => openChildFlyout({ Component: FlyoutThreeChildTwo, width: 800 })}
          >
            Open a different detail flyout
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const FlyoutThreeChildOne: React.FC<JourneyFlyoutProps> = ({ openChildFlyout, openNextFlyout }) => {
  return (
    <>
      <EuiText>This is a detail flyout!</EuiText>
      <EuiSpacer />
      <EuiButton
        onClick={() => openChildFlyout({ Component: FlyoutThreeChildOneChild, width: 800 })}
      >
        Replace this detail flyout
      </EuiButton>
    </>
  );
};

const FlyoutThreeChildOneChild: React.FC<JourneyFlyoutProps> = ({}) => {
  return (
    <>
      <EuiText>Another detail flyout</EuiText>
    </>
  );
};

const FlyoutThreeChildTwo: React.FC<JourneyFlyoutProps> = () => {
  return (
    <EuiText>
      <h2>A second detail flyout</h2>
      Second detail flyout
    </EuiText>
  );
};

const FlyoutFour: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Main flyout four</h2>
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutFive, width: 800 })}>
        Checkout flyout five
      </EuiButton>
    </>
  );
};

const FlyoutFive: React.FC<JourneyFlyoutProps> = ({}) => {
  return (
    <EuiText>
      <h2>Main flyout Five</h2>
      <EuiText>This is the end of the flyout sequence.</EuiText>
    </EuiText>
  );
};

export const GreyboxExample = () => {
  const flyoutApi = useRef<JourneyFlyoutApi | null>(null);

  return (
    <>
      <EuiText>
        <>
          <p>
            This example contains a simplistic greybox demonstration of the features of the system.
            There are two types of journey flyouts, main lyouts and detail flyouts.
          </p>
          <ul>
            <li>
              <strong>Main flyouts</strong> are capable of linking to subsequent main flyouts. The
              next flyout will be displayed over top, and the current flyout will be hidden. When
              opening a sequence of main flyouts, the user can navigate backwards and forwards
              through the sequence.
            </li>
            <li>
              <strong>Detail flyouts</strong> can be opened from main flyouts, and always open on
              the left. When a detail flyout is open, the main flyout or the detail flyout can open
              an additional detail flyout, which will replace the currently open one. Main flyouts
              will remember which detail flyout was open when they are reopened.
            </li>
          </ul>
        </>
      </EuiText>
      <EuiSpacer />
      <EuiButton
        onClick={() => flyoutApi.current?.openFlyout({ Component: FlyoutOne, width: 800 })}
      >
        Open showcase flyout
      </EuiButton>
      <JourneyFlyout ref={flyoutApi} />
    </>
  );
};
