/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type FC, useState } from 'react';

import {
  EuiButton,
  EuiFieldText,
  EuiFormRow,
  EuiListGroup,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ManagedFlyoutEntry, OverlayStart } from '@kbn/core-overlays-browser';

interface DemoDeps {
  overlays: OverlayStart;
}

const DataList: FC = () => {
  return <>Hello world</>;
};

const childFlyoutConfig: ManagedFlyoutEntry = {
  renderBody: () => {
    return (
      <EuiText>
        <h4>Child Flyout Content!</h4>
        <p>This panel is aligned to the left of the main flyout.</p>
        <DataList />
      </EuiText>
    );
  },
};

const step1Config: ManagedFlyoutEntry = {
  flyoutProps: () => ({
    size: 400,
    type: 'push',
  }),
  renderHeader: () => (
    <EuiTitle size="m">
      <h2>Step 1: The initial flyout</h2>
    </EuiTitle>
  ),
  renderBody: ({ nextFlyout }) => {
    const handleGoToStep2 = () => {
      nextFlyout(step2Config);
    };

    return (
      <EuiText>
        <p>This is the first step in the flyout sequence.</p>
        <DataList />
        <p>
          <EuiButton onClick={handleGoToStep2}>Go to Step 2</EuiButton>
        </p>
      </EuiText>
    );
  },
  footerActions: ({ openChildFlyout }) => ({
    openChildFlyout: (
      <EuiButton
        key="openChildFlyout"
        onClick={() => openChildFlyout(childFlyoutConfig)}
        color="primary"
      >
        Open Child Flyout
      </EuiButton>
    ),
  }),
};

const step2Config: ManagedFlyoutEntry = {
  flyoutProps: () => ({
    size: 600,
    type: 'push',
  }),
  renderHeader: () => (
    <EuiTitle size="m">
      <h2>Step 2: The second flyout</h2>
    </EuiTitle>
  ),
  renderBody: () => {
    return (
      <EuiText>
        <p>This is the second step in the flyout sequence.</p>
        <DataList />
      </EuiText>
    );
  },
  footerActions: ({ goBack, openChildFlyout }) => ({
    goBack: (
      <EuiButton
        key="goBack"
        onClick={goBack}
        color="text"
        fill
        data-test-subj="flyoutGoBackButton"
      >
        Go Back
      </EuiButton>
    ),
    openChildFlyout: (
      <EuiButton
        key="openChildFlyout"
        onClick={() => openChildFlyout(childFlyoutConfig)}
        color="primary"
      >
        Open Child Flyout
      </EuiButton>
    ),
  }),
};

const complexFlyoutConfig: ManagedFlyoutEntry = {
  flyoutProps: () => ({
    type: 'push',
    size: 800,
  }),
  renderBody: () => {
    const ComplexComponent: FC = () => {
      return (
        <EuiText>
          <h4>Complex Flyout Content!</h4>
          <p>This flyout has no header and is more complex.</p>
        </EuiText>
      );
    };

    return <ComplexComponent />;
  },
  footerActions: ({ openChildFlyout }) => ({
    openChildFlyout: (
      <EuiButton
        key="openChildFlyout"
        onClick={() => openChildFlyout(childFlyoutConfig)}
        color="primary"
      >
        Open Child Flyout
      </EuiButton>
    ),
  }),
};

export const Demo: FC<DemoDeps> = ({ overlays }) => {
  const { openFlyout, closeFlyout, isFlyoutOpen } = overlays.useManagedFlyout();

  const [username, setUsername] = useState('');
  const [isPushMode, setIsPushMode] = useState(true);

  const handleOpenInitialFlyout = useCallback(() => {
    openFlyout(step1Config);
  }, [openFlyout]);

  const handleOpenComplexFlyout = useCallback(() => {
    openFlyout(complexFlyoutConfig);
  }, [openFlyout]);

  const handleCheckFlyoutStatus = useCallback(() => {
    alert(`The flyout is currently ${isFlyoutOpen() ? 'open' : 'closed'}. (Synchronous check)`);
  }, [isFlyoutOpen]);

  return (
    <EuiText>
      <h1>Demo</h1>
      <EuiPanel>
        <EuiFormRow label="Username">
          <EuiFieldText
            id="username-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name"
          />
        </EuiFormRow>

        <EuiFormRow>
          <EuiSwitch
            label="Enable push mode"
            checked={isPushMode}
            onChange={(e) => setIsPushMode(e.target.checked)}
          />
        </EuiFormRow>
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel>
        <EuiListGroup
          listItems={[
            {
              label: 'Open step-by-step flyout with header',
              href: '#',
              onClick: handleOpenInitialFlyout,
            },
            {
              label: 'Open complex flyout (no header)',
              href: '#',
              onClick: handleOpenComplexFlyout,
            },
            {
              label: 'Close flyout',
              href: '#',
              onClick: closeFlyout,
            },
            {
              label: 'Check flyout status (sync)',
              href: '#',
              onClick: handleCheckFlyoutStatus,
            },
          ]}
          color="primary"
          flush={true}
        />
      </EuiPanel>
    </EuiText>
  );
};
