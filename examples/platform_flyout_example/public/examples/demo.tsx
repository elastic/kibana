/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type FC, useState, useMemo } from 'react';

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
import { dataListCss } from './styles';

interface DemoDeps {
  overlays: OverlayStart;
}

interface FlyoutProps {
  username: string;
  isPushMode: boolean;
}

const DemoContext = React.createContext<FlyoutProps | undefined>(undefined);

const useDemoContext = () => {
  const context = React.useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoContext must be used within a DemoContextProvider');
  }
  return context;
};

const DataList: FC = () => {
  const { username, isPushMode } = useDemoContext();
  return (
    <>
      <p>Provided data:</p>
      <ul css={dataListCss}>
        <li>Username: {username}</li>
        <li>Overlay type: {isPushMode ? 'push' : 'overlay'}</li>
      </ul>
    </>
  );
};

type DemoFlyoutEntry = ManagedFlyoutEntry<FlyoutProps>;

const childFlyoutConfig: DemoFlyoutEntry = {
  renderBody: (_api, props) => {
    return (
      <DemoContext.Provider value={props}>
        <EuiText>
          <h4>Child Flyout Content!</h4>
          <p>This panel is aligned to the left of the main flyout.</p>
          <DataList />
        </EuiText>
      </DemoContext.Provider>
    );
  },
};

const step1Config: DemoFlyoutEntry = {
  flyoutProps: (_, { isPushMode }) => ({
    size: 400,
    type: isPushMode ? 'push' : 'overlay',
  }),
  renderHeader: () => (
    <EuiTitle size="m">
      <h2>Step 1: The initial flyout</h2>
    </EuiTitle>
  ),
  renderBody: ({ nextFlyout }, props) => {
    const handleGoToStep2 = () => {
      nextFlyout(step2Config, props);
    };

    return (
      <DemoContext.Provider value={props}>
        <EuiText>
          <p>This is the first step in the flyout sequence.</p>
          <DataList />

          <p>
            <EuiButton onClick={handleGoToStep2}>Go to Step 2</EuiButton>
          </p>
        </EuiText>
      </DemoContext.Provider>
    );
  },
  footerActions: ({ openChildFlyout }, props) => ({
    openChildFlyout: (
      <EuiButton
        key="openChildFlyout"
        onClick={() => {
          openChildFlyout(childFlyoutConfig, props);
        }}
        color="primary"
      >
        Open Child Flyout
      </EuiButton>
    ),
  }),
};

const step2Config: DemoFlyoutEntry = {
  flyoutProps: (_, { isPushMode }) => ({
    size: 600,
    type: isPushMode ? 'push' : 'overlay',
  }),
  renderHeader: () => (
    <EuiTitle size="m">
      <h2>Step 2: The second flyout</h2>
    </EuiTitle>
  ),
  renderBody: (_, props) => {
    return (
      <DemoContext.Provider value={props}>
        <EuiText>
          <p>This is the second step in the flyout sequence.</p>
          <DataList />
        </EuiText>
      </DemoContext.Provider>
    );
  },
  footerActions: ({ goBack, openChildFlyout }, props) => ({
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
        onClick={() => {
          openChildFlyout(childFlyoutConfig, props);
        }}
        color="primary"
      >
        Open Child Flyout
      </EuiButton>
    ),
  }),
};

const complexFlyoutConfig: DemoFlyoutEntry = {
  flyoutProps: (_, { isPushMode }) => ({
    type: isPushMode ? 'push' : 'overlay',
    size: 800,
  }),
  renderBody: ({ openChildFlyout }, props) => {
    const ComplexComponent: FC = () => {
      const [localState, setLocalState] = useState<string | null>(null);

      const handleClickOpenChildFlyout = useCallback(() => {
        openChildFlyout(childFlyoutConfig, props);
      }, []);

      return (
        <DemoContext.Provider value={props}>
          <EuiText>
            <EuiPanel>
              <p>This flyout manages its own local state.</p>
              <EuiFormRow label="Local state example">
                <EuiFieldText
                  value={localState ?? ''}
                  onChange={(e) => setLocalState(e.target.value)}
                  placeholder="Enter some text"
                />
              </EuiFormRow>
              <p>You typed: {localState ?? 'nothing'}</p>
            </EuiPanel>

            <EuiSpacer />

            <DataList />

            <p>
              <a href="#" onClick={handleClickOpenChildFlyout}>
                Would you like to open a child flyout?
              </a>
            </p>
          </EuiText>
        </DemoContext.Provider>
      );
    };

    return <ComplexComponent />;
  },
};

export const Demo: FC<DemoDeps> = ({ overlays }) => {
  const { openFlyout, closeFlyout, isFlyoutOpen } = overlays.useManagedFlyout();

  const [username, setUsername] = useState('');
  const [isPushMode, setIsPushMode] = useState(true);

  const props = useMemo(() => ({ username, isPushMode }), [username, isPushMode]);

  const handleOpenInitialFlyout = useCallback(() => {
    openFlyout(step1Config, props);
  }, [openFlyout, props]);

  const handleOpenComplexFlyout = useCallback(() => {
    openFlyout(complexFlyoutConfig, props);
  }, [openFlyout, props]);

  const handleOpenInitialFlyoutWithChildFlyoutOpen = useCallback(() => {
    openFlyout(step1Config, props, childFlyoutConfig, props);
  }, [openFlyout, props]);

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
              label: 'Open flyout with child flyout already open',
              href: '#',
              onClick: handleOpenInitialFlyoutWithChildFlyoutOpen,
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
