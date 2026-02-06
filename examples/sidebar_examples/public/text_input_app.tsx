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
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarHeader, SidebarBody } from '@kbn/core-chrome-sidebar-components';

export const textInputAppId = 'sidebarExampleText';

export const getTextInputParamsSchema = () =>
  z.object({
    userName: z.string().default(''),
  });

export type TextInputSidebarParams = z.infer<ReturnType<typeof getTextInputParamsSchema>>;

/**
 * Text input app that receives params and setParams as props.
 * Params are persisted to localStorage automatically.
 */
export function TextInputApp({
  params,
  setParams,
  onClose,
}: SidebarComponentProps<TextInputSidebarParams>) {
  const { userName } = params;

  return (
    <>
      <SidebarHeader title="Text Input Example" onClose={onClose} />
      <SidebarBody>
        <EuiText size="s" color="subdued">
          <p>Simple text input with params persistence.</p>
        </EuiText>

        <EuiSpacer size="l" />

        <EuiFormRow label="User Name">
          <EuiFieldText
            placeholder="Enter your name"
            value={userName || ''}
            onChange={(e) => setParams({ userName: e.target.value })}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiPanel color="subdued" paddingSize="s">
          <EuiText size="xs">
            <pre>{JSON.stringify(params, null, 2)}</pre>
          </EuiText>
        </EuiPanel>
      </SidebarBody>
    </>
  );
}
