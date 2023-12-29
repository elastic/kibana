/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useState } from 'react';
import {
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiButtonIcon,
  EuiText,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css as classNameCss } from '@emotion/css';
import { Interpolation, Theme, css } from '@emotion/react';
import {
  type ObservabilityAIAssistantPluginStart,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';
import { getAiService } from './get_ai_service';

export function ErrorsPopover({ error }: { error: string }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="error"
            color="danger"
            size="s"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiText
                size="xs"
                color="danger"
                css={css`
                  &:hover {
                    cursor: pointer;
                    text-decoration: underline;
                  }
                `}
                onClick={() => {
                  setIsPopoverOpen(!isPopoverOpen);
                }}
              >
                <p>
                  {i18n.translate('textBasedEditor.query.aiAssistant.errorCount', {
                    defaultMessage: '1 error',
                  })}
                </p>
              </EuiText>
            }
            ownFocus={false}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <div style={{ width: 500 }}>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.errorsTitle', {
                  defaultMessage: 'Errors',
                })}
              </EuiPopoverTitle>
              <EuiDescriptionList>
                <EuiDescriptionListDescription
                  key="error"
                  className={classNameCss`
                    &:hover {
                      cursor: pointer;
                    }
                  `}
                >
                  <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="error" color="danger" size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} className="TextBasedLangEditor_errorMessage">
                      {error}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiDescriptionListDescription>
              </EuiDescriptionList>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

// should be moved to a package
export enum MessageRole {
  System = 'system',
  Assistant = 'assistant',
  User = 'user',
  Function = 'function',
  Elastic = 'elastic',
}

interface ChatProps {
  containerCSS: Interpolation<Theme>;
  textAreaCSS: Interpolation<Theme>;
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
  chatService: ObservabilityAIAssistantChatService;
  height: number;
  resizeRef: (e: HTMLElement | null) => void;
  resizableCSS: Interpolation<Theme>;
  onHumanLanguageRun: (queryString: string) => void;
}

export const Chat = memo(function Chat({
  containerCSS,
  textAreaCSS,
  observabilityAIAssistant,
  chatService,
  height,
  resizableCSS,
  resizeRef,
  onHumanLanguageRun,
}: ChatProps) {
  const [chatAreaValue, setChatAreaValue] = useState('');
  const [wrongResult, setWrongResult] = useState<string | undefined>(undefined);
  const [requestHasBeenSubmitted, setRequestHasBeenSubmitted] = useState(false);
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (wrongResult) {
      setWrongResult(undefined);
    }
    setChatAreaValue(e.target.value);
  };
  const aiService = getAiService(observabilityAIAssistant, chatService);
  if (!aiService.isLoading && requestHasBeenSubmitted) {
    const assistantESQLMessages = aiService.messages.filter(({ message }) => {
      return 'content' in message && message.content && message.role === MessageRole.Assistant;
    });
    if (assistantESQLMessages.length) {
      const message = assistantESQLMessages[assistantESQLMessages.length - 1];
      if (message && message.message.content?.includes('ES|QL')) {
        const splitCode = message.message.content?.split('```');
        if (splitCode && splitCode.length > 1) {
          const esqlQuery = splitCode[1].replace('esql', '');
          onHumanLanguageRun(esqlQuery);
          setRequestHasBeenSubmitted(false);
          aiService.stop();
        }
      } else {
        if (!wrongResult) {
          setWrongResult(message.message.content ?? 'Unknown error');
          setRequestHasBeenSubmitted(false);
        }
        aiService.stop();
      }
    }
    aiService.stop();
  }
  const textAreaHeight = aiService.isLoading ? height - 2 : height;
  return (
    <>
      <div ref={resizeRef} css={resizableCSS}>
        <EuiFlexItem className="TextBasedLangEditor--expanded">
          <div css={textAreaCSS}>
            {aiService.isLoading && <EuiProgress size="xs" color="accent" />}
            <EuiTextArea
              placeholder="I can help with ES|QL!"
              value={chatAreaValue}
              onChange={(e) => onChange(e)}
              fullWidth
              css={css`
                width: 100%;
                height: ${textAreaHeight}px !important;
              `}
              resize="none"
            />
          </div>
        </EuiFlexItem>
      </div>
      <EuiFlexGroup
        gutterSize="s"
        justifyContent={wrongResult ? 'spaceBetween' : 'flexEnd'}
        alignItems="center"
        css={containerCSS}
        responsive={false}
      >
        {wrongResult && <ErrorsPopover error={wrongResult} />}
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            justifyContent="flexEnd"
            alignItems="center"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.aiMessage', {
                    defaultMessage: 'Send a message to the assistant',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="kqlFunction"
                color="accent"
                size="s"
                isDisabled={aiService.isLoading}
                onClick={() => {
                  setRequestHasBeenSubmitted(true);
                  aiService.next(
                    aiService.messages.concat({
                      '@timestamp': new Date().toISOString(),
                      message: {
                        role: MessageRole.User,
                        content: chatAreaValue,
                      },
                    })
                  );
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
