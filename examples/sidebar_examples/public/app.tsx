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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useSidebar } from '@kbn/core-chrome-sidebar';
import React from 'react';
import { counterApp } from './counter_app';
import { textApp } from './text_input_app';
import { tabApp } from './tab_selection_app';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

export function App({}: Props) {
  const { close, setWidth } = useSidebar();
  const { open: openCounterApp, reset: resetCounter } = counterApp.useActions();
  const { open: openTextInputApp, clear: resetTextInput } = textApp.useActions();
  const { open: openTabsApp, reset: resetTabs } = tabApp.useActions();

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
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
