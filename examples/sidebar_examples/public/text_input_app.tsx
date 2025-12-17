/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel, EuiTitle, EuiSpacer, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import { useSidebarAppState, useSidebar } from '@kbn/core-chrome-sidebar';

export const textInputAppId = 'sidebarExampleText';

export interface TextInputState {
  userName: string;
}

export const useTextInputSideBarApp = () => {
  const { open } = useSidebar();
  const [, { reset }] = useTextInputAppState();
  return {
    open: () => open(textInputAppId),
    reset: () => reset(),
  };
};

const useTextInputAppState = () => {
  return useSidebarAppState<TextInputState>(textInputAppId);
};

export function TextInputApp() {
  const [state, { update }] = useTextInputAppState();

  return (
    <EuiPanel paddingSize="none" hasBorder={false} hasShadow={false}>
      <EuiTitle size="s">
        <h2>Text Input Example</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText size="s" color="subdued">
        <p>Simple text input with state persistence.</p>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFormRow label="User Name">
        <EuiFieldText
          placeholder="Enter your name"
          value={state.userName}
          onChange={(e) => update({ userName: e.target.value })}
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
