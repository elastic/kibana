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

export interface TextInputProps {
  /** state passed from sidebar state store */
  state: TextInputSidebarState;
}

export interface TextInputSidebarState {
  /** user name input */
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
  return useSidebarAppState<TextInputSidebarState>(textInputAppId);
};

export function TextInputApp(props: TextInputProps) {
  const [state, { update }] = useTextInputAppState();

  const userName = state.userName;

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
          value={userName}
          onChange={(e) => update({ userName: e.target.value })}
        />
      </EuiFormRow>

      <EuiSpacer size="l" />

      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify({ userName }, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
}
