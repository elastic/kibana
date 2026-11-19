/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiProvider,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { DeveloperToolbar, DeveloperToolbarItem } from '../../..';
import type { EnvironmentInfo } from '../../..';

const ENV_INFO: EnvironmentInfo = {
  mode: { name: 'development' },
  packageInfo: { version: '0.1.0', branch: 'main' },
  labels: { App: 'developer-toolbar-example', Host: window.location.host },
};

export const App = () => {
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [portal, setPortal] = useState(false);
  const [clicks, setClicks] = useState(0);

  return (
    <EuiProvider colorMode="light">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <EuiPageTemplate grow={true} style={{ paddingBottom: portal ? toolbarHeight : 0 }}>
          <EuiPageTemplate.Header pageTitle="Developer toolbar example" />
          <EuiPageTemplate.Section>
            <EuiText>
              <p>
                <EuiCode>DeveloperToolbar</EuiCode> renders at the bottom of the page. Use{' '}
                <EuiCode>Ctrl+\</EuiCode> / <EuiCode>⌘+\</EuiCode> to minimize or expand it.
              </p>
              <p>
                Reported height: <EuiCode>{toolbarHeight}</EuiCode>
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() =>
                    setTimeout(() => {
                      throw new Error('Example uncaught error');
                    })
                  }
                >
                  Throw uncaught error
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => Promise.reject(new Error('Example unhandled rejection'))}>
                  Reject promise
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiSwitch
              label="Portal the toolbar to document.body"
              checked={portal}
              onChange={(e) => setPortal(e.target.checked)}
            />
          </EuiPageTemplate.Section>
        </EuiPageTemplate>

        <DeveloperToolbarItem id="exampleCounter" priority={10}>
          <EuiToolTip content={`Clicked ${clicks} times`}>
            <EuiButtonIcon
              iconType="plusCircle"
              size="xs"
              color="text"
              aria-label="Example toolbar item"
              onClick={() => setClicks((count) => count + 1)}
            />
          </EuiToolTip>
        </DeveloperToolbarItem>

        <DeveloperToolbar
          envInfo={ENV_INFO}
          onHeightChange={setToolbarHeight}
          disableHint="Remove <DeveloperToolbar /> from the example app to disable"
          iconType="logoElastic"
          portal={portal}
        />
      </div>
    </EuiProvider>
  );
};
