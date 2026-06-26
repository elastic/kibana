/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiProvider,
  EuiText,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeader,
  EuiHeaderLogo,
} from '@elastic/eui';

import { ChromeLayout, ChromeLayoutConfigProvider, GridLayoutGlobalStyles } from '../../..';

const App = () => {
  const layoutConfig = {
    headerHeight: 48,
    navigationWidth: 200,
  };

  return (
    <EuiProvider colorMode="light">
      <GridLayoutGlobalStyles chromeStyle="project" />
      <ChromeLayoutConfigProvider value={layoutConfig}>
        <ChromeLayout
          header={
            <EuiHeader>
              <EuiHeaderLogo iconType="logoElastic">Elastic</EuiHeaderLogo>
            </EuiHeader>
          }
          navigation={
            <div style={{ padding: '16px', background: '#f5f5f5', height: '100%' }}>
              <EuiText size="s">
                <p>Navigation</p>
              </EuiText>
            </div>
          }
        >
          <div style={{ padding: '24px' }}>
            <EuiText>
              <h1>
                <EuiCode>ChromeLayout</EuiCode> Example
              </h1>
              <p>
                This example renders the chrome layout with a header slot and a navigation slot.
              </p>
            </EuiText>
            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={false}>
                <EuiCode>headerHeight: {layoutConfig.headerHeight}px</EuiCode>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCode>navigationWidth: {layoutConfig.navigationWidth}px</EuiCode>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </ChromeLayout>
      </ChromeLayoutConfigProvider>
    </EuiProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
