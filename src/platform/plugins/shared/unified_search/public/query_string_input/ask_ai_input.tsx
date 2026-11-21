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
  EuiResizeObserver,
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
  const promptRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [prompt, setPrompt] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  // Measured so the text never runs under the buttons, whatever their rendered width
  const [actionsWidth, setActionsWidth] = useState<number>();
  const isPopoverShown = isPopoverOpen && !prompt;
  const trimmedPrompt = prompt.trim();
  const visiblePrompts = suggestedPrompts.slice(0, MAX_SUGGESTED_PROMPTS);

  const submit = () => {
    if (trimmedPrompt) {
      onSubmit(trimmedPrompt);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === keys.ENTER) {
      event.preventDefault();
      submit();
    }
    if (event.key === keys.ARROW_DOWN && isPopoverShown) {
      event.preventDefault();
      promptRefs.current[0]?.focus();
    }
    // The popover takes the first Escape to hide the suggested prompts, the next one closes the input
    if (event.key === keys.ESCAPE && !isPopoverShown) {
      onClose();
    }
  };

  const onPromptsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focusedIndex = promptRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === keys.ARROW_DOWN) {
      event.preventDefault();
      promptRefs.current[focusedIndex + 1]?.focus();
    } else if (event.key === keys.ARROW_UP) {
      event.preventDefault();
      (promptRefs.current[focusedIndex - 1] ?? inputRef.current)?.focus();
    } else if (event.key === keys.ESCAPE) {
      // Let the popover close, but keep the focus in the input rather than dropping it
      inputRef.current?.focus();
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
            onKeyDown={onInputKeyDown}
            placeholder={i18n.translate('unifiedSearch.query.askAi.placeholder', {
              defaultMessage: 'Describe your query in natural language',
            })}
            aria-label={i18n.translate('unifiedSearch.query.askAi.inputAriaLabel', {
              defaultMessage: 'Ask AI',
            })}
            style={actionsWidth ? { paddingRight: actionsWidth } : undefined}
            data-test-subj="unifiedSearchAskAiInput"
          />
          <EuiResizeObserver onResize={({ width }) => setActionsWidth(width)}>
            {(resizeRef) => (
              <div ref={resizeRef} css={styles.actions}>
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
            )}
          </EuiResizeObserver>
        </div>
      }
    >
      <EuiPopoverTitle paddingSize="s">
        {i18n.translate('unifiedSearch.query.askAi.suggestedPromptsTitle', {
          defaultMessage: 'Suggested prompts',
        })}
      </EuiPopoverTitle>
      <div onKeyDown={onPromptsKeyDown}>
        <EuiListGroup maxWidth={false} css={styles.prompts}>
          {visiblePrompts.map((suggestedPrompt, index) => (
            <EuiListGroupItem
              key={suggestedPrompt}
              label={suggestedPrompt}
              color="text"
              onClick={() => selectPrompt(suggestedPrompt)}
              buttonRef={(node) => {
                promptRefs.current[index] = node;
              }}
              data-test-subj="unifiedSearchAskAiPrompt"
            />
          ))}
        </EuiListGroup>
      </div>
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
