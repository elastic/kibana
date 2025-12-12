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
  EuiTitle,
} from '@elastic/eui';
import { useSidebar } from '@kbn/core-chrome-sidebar';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

export function App({}: Props) {
  const { open, close } = useSidebar();

  const handleOpenSidebar = () => {
    open('sidebarExampleBasic');
  };

  const handleCloseSidebar = () => {
    close();
  };

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        <EuiPageHeader pageTitle="Sidebar Examples" />

        <EuiPageSection>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Controls</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleOpenSidebar}>Open</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={handleCloseSidebar}>Close</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="l" />

          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Usage</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="tsx" isCopyable>
              {`import { useSidebar } from '@kbn/core-chrome-sidebar';

function MyComponent() {
  const { open, close } = useSidebar();

  return (
    <>
      <button onClick={() => open('mySidebarId')}>
        Open
      </button>
      <button onClick={() => close()}>
        Close
      </button>
    </>
  );
}`}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
