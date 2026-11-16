/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent, Ref } from 'react';
import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  keys,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { AiButtonEmpty } from '@kbn/ui-ai-components';

const MAX_SUGGESTED_PROMPTS = 5;

const sendLabel = i18n.translate('unifiedSearch.query.askAi.sendLabel', {
  defaultMessage: 'Send',
});

const closeLabel = i18n.translate('unifiedSearch.query.askAi.closeLabel', {
  defaultMessage: 'Close',
});

export interface AskAiConfig {
  suggestedPrompts: readonly string[];
  onSubmit: (prompt: string) => void;
}

export interface AskAiButtonProps {
  onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}

export const AskAiButton = ({ onClick, buttonRef }: AskAiButtonProps) => (
  <AiButtonEmpty
    size="xs"
    iconType="sparkles"
    onClick={onClick}
    buttonRef={buttonRef}
    data-test-subj="unifiedSearchAskAiButton"
  >
    {i18n.translate('unifiedSearch.query.askAi.buttonLabel', { defaultMessage: 'Ask AI' })}
  </AiButtonEmpty>
);

export interface AskAiInputProps extends AskAiConfig {
  onClose: () => void;
}

export const AskAiInput = ({ suggestedPrompts, onSubmit, onClose }: AskAiInputProps) => {
  const styles = useMemoCss(askAiInputStyles);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const isPopoverShown = isPopoverOpen && !prompt;
  const trimmedPrompt = prompt.trim();

  const submit = () => {
    if (trimmedPrompt) {
      onSubmit(trimmedPrompt);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === keys.ENTER) {
      event.preventDefault();
      submit();
    }
    // The popover takes the first Escape to hide the suggested prompts, the next one closes the input
    if (event.key === keys.ESCAPE && !isPopoverShown) {
      onClose();
    }
  };

  const selectPrompt = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
    inputRef.current?.focus();
  };

  return (
    <EuiInputPopover
      fullWidth
      isOpen={isPopoverShown}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      disableFocusTrap
      input={
        <div css={styles.inputWrapper}>
          <EuiFieldText
            compressed
            fullWidth
            autoFocus
            icon="sparkles"
            inputRef={inputRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onFocus={() => setIsPopoverOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={i18n.translate('unifiedSearch.query.askAi.placeholder', {
              defaultMessage: 'Describe your query in natural language',
            })}
            aria-label={i18n.translate('unifiedSearch.query.askAi.inputAriaLabel', {
              defaultMessage: 'Ask AI',
            })}
            css={styles.input}
            data-test-subj="unifiedSearchAskAiInput"
          />
          <div css={styles.actions}>
            <EuiToolTip content={sendLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="return"
                display="fill"
                color="primary"
                size="xs"
                isDisabled={!trimmedPrompt}
                onClick={submit}
                aria-label={sendLabel}
                data-test-subj="unifiedSearchAskAiSend"
              />
            </EuiToolTip>
            <div css={styles.separator}>
              <EuiToolTip content={closeLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  color="text"
                  size="xs"
                  onClick={onClose}
                  aria-label={closeLabel}
                  data-test-subj="unifiedSearchAskAiClose"
                />
              </EuiToolTip>
            </div>
          </div>
        </div>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('unifiedSearch.query.askAi.suggestedPromptsTitle', {
          defaultMessage: 'Suggested prompts',
        })}
      </EuiPopoverTitle>
      <EuiListGroup maxWidth={false} css={styles.prompts}>
        {suggestedPrompts.slice(0, MAX_SUGGESTED_PROMPTS).map((suggestedPrompt) => (
          <EuiListGroupItem
            key={suggestedPrompt}
            label={suggestedPrompt}
            color="text"
            onClick={() => selectPrompt(suggestedPrompt)}
            data-test-subj="unifiedSearchAskAiPrompt"
          />
        ))}
      </EuiListGroup>
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('unifiedSearch.query.askAi.newTabInfo', {
                defaultMessage: 'Results will open in a new tab',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiInputPopover>
  );
};

const askAiInputStyles = {
  inputWrapper: css({
    position: 'relative',
  }),
  input: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingRight: `calc(${euiTheme.size.xxxxl} + ${euiTheme.size.s})`,
    }),
  actions: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
      paddingInline: euiTheme.size.xs,
    }),
  separator: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      paddingLeft: euiTheme.size.xs,
      borderLeft: euiTheme.border.thin,
    }),
  prompts: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xs,
    }),
};
