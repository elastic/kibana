/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import { z } from '@kbn/zod/v4';
import { createSidebarStore, type SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarHeader, SidebarBody, useSidebarApp } from '@kbn/core-chrome-sidebar-components';

export const textInputAppId = 'sidebarExampleText';

/** Store for text input sidebar app */
export const textInputStore = createSidebarStore({
  schema: z.object({
    userName: z.string().default(''),
  }),
  actions: (set, get, { close }) => ({
    setUserName: (userName: string) => set({ userName }),
    clear: () => set({ userName: '' }),
    /** Demonstrates sidebar context - clear state and close */
    clearAndClose: () => {
      set({ userName: '' });
      close();
    },
  }),
});

export type TextInputState = typeof textInputStore.types.state;
export type TextInputActions = typeof textInputStore.types.actions;

/** Typed hook for the text input sidebar app */
export const useTextInputSidebarApp = () =>
  useSidebarApp<TextInputState, TextInputActions>(textInputAppId);

/**
 * Text input app that receives state and actions as props.
 * State is persisted to localStorage automatically.
 */
export function TextInputApp({
  state,
  actions,
  onClose,
}: SidebarComponentProps<TextInputState, TextInputActions>) {
  const { userName } = state;

  return (
    <>
      <SidebarHeader title="Text Input Example" onClose={onClose} />
      <SidebarBody>
        <EuiText size="s" color="subdued">
          <p>Simple text input with state persistence.</p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiFormRow label="User Name">
          <EuiFieldText
            placeholder="Enter your name"
            value={userName || ''}
            onChange={(e) => actions.setUserName(e.target.value)}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiPanel color="subdued" paddingSize="s">
          <EuiText size="xs">
            <pre>{JSON.stringify(state, null, 2)}</pre>
          </EuiText>
        </EuiPanel>
      </SidebarBody>
    </>
  );
}
