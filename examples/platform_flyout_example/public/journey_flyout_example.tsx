/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton, EuiText } from '@elastic/eui';
import React, { useRef } from 'react';
import { JourneyFlyoutApi } from './journey_flyouts/types';
import { JourneyFlyout } from './journey_flyouts/journey_flyout';

const FlyoutOne: React.FC<JourneyFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout one</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutTwo })}>Open flyout 2</EuiButton>
    </EuiText>
  );
};

const FlyoutTwo: React.FC<JourneyFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout two</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutThree })}>Go to flyout 3</EuiButton>
    </EuiText>
  );
};

const FlyoutThree: React.FC<JourneyFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout three</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutFour })}>
        Wanna see flyout four?
      </EuiButton>
    </EuiText>
  );
};

const FlyoutFour: React.FC<JourneyFlyoutApi> = ({ openFlyout }) => {
  return (
    <EuiText>
      <h2>Flyout four</h2>
      <EuiButton onClick={() => openFlyout({ Component: FlyoutFive })}>
        Checkout flyout five
      </EuiButton>
    </EuiText>
  );
};

const FlyoutFive: React.FC<JourneyFlyoutApi> = ({ openFlyout }) => {
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
