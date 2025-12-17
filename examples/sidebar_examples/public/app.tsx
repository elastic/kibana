/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useSidebar } from '@kbn/core-chrome-sidebar';
import React from 'react';
import { useCounterSideBarApp } from './counter_app';
import { useTextInputSideBarApp } from './text_input_app';
import { useTabSelectionSideBarApp } from './tab_selection_app';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

export function App({}: Props) {
  const { close, setWidth } = useSidebar();
  const { open: openCounterApp, reset: resetCounter } = useCounterSideBarApp();
  const { open: openTextInputApp, reset: resetTextInput } = useTextInputSideBarApp();
  const { open: openTabsApp, reset: resetTabs } = useTabSelectionSideBarApp();

  const handleOpenTextApp = () => {
    openTextInputApp();
  };

  const handleOpenCounterApp = () => {
    openCounterApp();
  };

  const handleOpenTabsApp = () => {
    openTabsApp();
  };

  const handleCloseSidebar = () => {
    close();
  };

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        <EuiPageHeader pageTitle="Sidebar Examples" />

        <EuiPageSection>
          {/* Text Input App Controls */}
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Text Input App</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleOpenTextApp}>Open Text Input</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => resetTextInput()}>Reset Text Input</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Counter App Controls */}
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Counter App</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleOpenCounterApp}>Open Counter</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => resetCounter()}>Reset Counter</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Tab Selection App Controls */}
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Tab Selection App</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleOpenTabsApp}>Open Tabs</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => resetTabs()}>Reset Tabs</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          {/* Global Sidebar Controls */}
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Global Sidebar Controls</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleCloseSidebar}>Close</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setWidth(600)}>Large Width (600px)</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setWidth(300)}>Small Width (300px)</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="l" />

          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Usage</h3>
            </EuiTitle>
            <EuiSpacer size="m" />

            <EuiTitle size="xs">
              <h4>Basic Sidebar Control</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="tsx" isCopyable>
              {`import { useSidebar } from '@kbn/core-chrome-sidebar';

function MyComponent() {
  const { open, close, setWidth } = useSidebar();

  return (
    <>
      <button onClick={() => open('mySidebarId')}>Open</button>
      <button onClick={() => close()}>Close</button>
      <button onClick={() => setWidth(500)}>Set Width</button>
    </>
  );
}`}
            </EuiCodeBlock>

            <EuiSpacer size="l" />

            <EuiTitle size="xs">
              <h4>Sidebar App State Management</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                Sidebar apps can maintain persistent state using <code>useSidebarAppState</code>.
                State is scoped to the sidebar app ID and persists across open/close cycles.
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="tsx" isCopyable>
              {`import { useSidebarAppState, useSidebar } from '@kbn/core-chrome-sidebar';

// Define your state interface
interface MyAppState {
  count: number;
  userName: string;
}

const MY_APP_ID = 'myCustomApp';

// Inside the sidebar app component
function MySidebarApp() {
  const { state, updateState } = useSidebarAppState<MyAppState>(MY_APP_ID);

  return (
    <div>
      <p>Count: {state?.count || 0}</p>
      <button onClick={() => updateState({ count: (state?.count || 0) + 1 })}>
        Increment
      </button>
    </div>
  );
}`}
            </EuiCodeBlock>

            <EuiSpacer size="l" />

            <EuiTitle size="xs">
              <h4>Controlling State from Outside</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                Any component can control a sidebar app&apos;s state by calling{' '}
                <code>useSidebarAppState</code> with the same app ID. This enables external controls
                like reset buttons.
              </p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCodeBlock language="tsx" isCopyable>
              {`// Create a hook to expose controls
export const useMyAppControls = () => {
  const { open } = useSidebar();
  const { updateState } = useSidebarAppState<MyAppState>(MY_APP_ID);

  return {
    open: () => open(MY_APP_ID),
    reset: () => updateState({ count: 0, userName: '' }),
    increment: () => updateState((prev) => ({
      ...prev,
      count: (prev?.count || 0) + 1
    })),
  };
};

// Use from any component
function ExternalControls() {
  const { open, reset, increment } = useMyAppControls();

  return (
    <>
      <button onClick={open}>Open Sidebar</button>
      <button onClick={reset}>Reset State</button>
      <button onClick={increment}>Increment from Outside</button>
    </>
  );
}`}
            </EuiCodeBlock>

            <EuiSpacer size="l" />

            <EuiTitle size="xs">
              <h4>Key Concepts</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <ul>
                <li>
                  <strong>Scoped State:</strong> Each sidebar app has its own state namespace based
                  on app ID
                </li>
                <li>
                  <strong>Persistence:</strong> State persists across open/close cycles until
                  explicitly reset
                </li>
                <li>
                  <strong>External Control:</strong> State can be read/updated from any component
                  using the app ID
                </li>
                <li>
                  <strong>Type Safety:</strong> State is fully typed using TypeScript generics
                </li>
                <li>
                  <strong>Partial Updates:</strong> Use <code>updateState</code> to merge changes
                  into existing state
                </li>
              </ul>
            </EuiText>
          </EuiPanel>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
