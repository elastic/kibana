/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { ConversationInputShell } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';

interface AgenticFirstPromptInputProps {
  placeholder?: string;
  onSubmit: (message: string) => void;
}

/**
 * Lightweight prompt input built on the shared `ConversationInputShell` (visual
 * shell — border, radius, shadow — same as `EmbeddableConversationInput`).
 *
 * Kept separate from `EmbeddableConversationInput` because that component
 * navigates to the Agent Builder app on submit; here we want the caller to
 * open the agent sidebar (via `agentBuilder.openChat`) and stay on the
 * workflow page.
 */
export function AgenticFirstPromptInput({ placeholder, onSubmit }: AgenticFirstPromptInputProps) {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  const handleSubmit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <ConversationInputShell data-test-subj="agenticFirstPromptShell">
      <EuiTextArea
        fullWidth
        rows={2}
        resize="none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={
          placeholder ??
          i18n.translate('workflows.agenticFirst.promptPlaceholder', {
            defaultMessage:
              'e.g. For each high-severity alert, send a Slack message to #security-alerts',
          })
        }
        data-test-subj="agenticFirstPromptInput"
        css={css`
          border: none;
          box-shadow: none;
          background: transparent;
          padding: 0;
          &:focus {
            box-shadow: none;
            outline: none;
          }
        `}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="sortUp"
            display="base"
            aria-label={i18n.translate('workflows.agenticFirst.submit', {
              defaultMessage: 'Submit prompt',
            })}
            onClick={handleSubmit}
            isDisabled={!trimmed}
            data-test-subj="agenticFirstSubmitButton"
            css={css`
              background: ${euiTheme.colors.primary};
              color: ${euiTheme.colors.textInverse};
              &:hover:not(:disabled) {
                background: ${euiTheme.colors.primary};
              }
            `}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ConversationInputShell>
  );
}
