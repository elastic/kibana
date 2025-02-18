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
import { JourneyFlyoutApi, JourneyFlyoutProps } from './journey_flyouts/types';
import { JourneyFlyout } from './journey_flyouts/journey_flyout';

const FlyoutOne: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Flyout one</h2>
        this is some other text. If you&apos;d like to see even more text, feel free to click the
        button
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutTwo })}>Open flyout 2</EuiButton>
    </>
  );
};

const FlyoutTwo: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Another flyout?</h2>
        Well what do we have here, a second flyout on top of the first one?
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutThree })}>
        Go to flyout 3
      </EuiButton>
    </>
  );
};

const FlyoutThree: React.FC<JourneyFlyoutProps> = ({ openNextFlyout, openChildFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Flyout three</h2>
        This flyout is a little more complicated, in that it can spawn a child flyout.
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton onClick={() => openNextFlyout({ Component: FlyoutFour })}>
            Wanna see flyout four?
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton onClick={() => openChildFlyout({ Component: FlyoutThreeChildOne })}>
            No? Maybe try a child flyout then
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const FlyoutThreeChildOne: React.FC<JourneyFlyoutProps> = ({ openChildFlyout }) => {
  return (
    <>
      <EuiText>This is a child component!</EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openChildFlyout({ Component: FlyoutThreeChildTwo })}>
        Replace this child flyout
      </EuiButton>
    </>
  );
};

const FlyoutThreeChildTwo: React.FC<JourneyFlyoutProps> = ({}) => {
  return (
    <>
      <EuiText>This is a second child flyout</EuiText>
    </>
  );
};

const FlyoutFour: React.FC<JourneyFlyoutProps> = ({ openNextFlyout }) => {
  return (
    <>
      <EuiText>
        <h2>Flyout four</h2>
      </EuiText>
      <EuiSpacer />
      <EuiButton onClick={() => openNextFlyout({ Component: FlyoutFive })}>
        Checkout flyout five
      </EuiButton>
    </>
  );
};

const FlyoutFive: React.FC<JourneyFlyoutProps> = ({}) => {
  return (
    <EuiText>
      <h2>Flyout Five</h2>
      <EuiText> Welcome to flyout 5!</EuiText>
    </EuiText>
  );
};

export const JourneyFlyoutExample = () => {
  const flyoutApi = useRef<JourneyFlyoutApi | null>(null);

  return (
    <>
      <EuiButton onClick={() => flyoutApi.current?.openFlyout({ Component: FlyoutOne })}>
        Open flyout
      </EuiButton>
      <JourneyFlyout ref={flyoutApi} />
    </>
  );
};
