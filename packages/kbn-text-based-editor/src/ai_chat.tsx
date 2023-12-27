/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useState } from 'react';
import { EuiTextArea, EuiFlexGroup, EuiFlexItem, EuiProgress, EuiButtonIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  type ObservabilityAIAssistantPluginStart,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';

// should be moved to a package
export enum MessageRole {
  System = 'system',
  Assistant = 'assistant',
  User = 'user',
  Function = 'function',
  Elastic = 'elastic',
}
export enum ChatState {
  Ready = 'ready',
  Loading = 'loading',
  Error = 'error',
  Aborted = 'aborted',
}
interface ChatProps {
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart;
  chatService: ObservabilityAIAssistantChatService;
  height: number;
  onHumanLanguageRun: (queryString: string) => void;
}

export const Chat = memo(function Chat({
  observabilityAIAssistant,
  chatService,
  height,
  onHumanLanguageRun,
}: ChatProps) {
  const [value, setValue] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };
  const aiConnectors = observabilityAIAssistant.useGenAIConnectors();

  // setMessages, stop can also be retrieved from here
  const { next, messages, state, stop } = observabilityAIAssistant?.useChat({
    chatService,
    connectorId: aiConnectors.selectedConnector,
    initialMessages: [],
    persist: false,
  });
  const isLoading = Boolean(aiConnectors.loading || state === ChatState.Loading);

  if (!isLoading) {
    const assistantESQLMessages = messages.filter(({ message }) => {
      return 'content' in message && message.content && message.role === MessageRole.Assistant;
    });
    if (assistantESQLMessages.length) {
      const message = assistantESQLMessages[assistantESQLMessages.length - 1];
      if (message && message.message.content?.includes('ES|QL')) {
        const splitCode = message.message.content?.split('```');
        if (splitCode && splitCode.length > 1) {
          const esqlQuery = splitCode[1].replace('esql', '');
          onHumanLanguageRun(esqlQuery);
          stop();
        }
      }
    }
    stop();
  }
  const textAreaHeight = isLoading ? height - 2 : height;

  return (
    <EuiFlexGroup gutterSize="none" justifyContent="center" alignItems="flexEnd" responsive={false}>
      <EuiFlexItem
        grow={false}
        css={css`
          width: 100%;
        `}
      >
        {isLoading && <EuiProgress size="xs" color="accent" />}
        <EuiTextArea
          placeholder="I can help with ES|QL!"
          value={value}
          onChange={(e) => onChange(e)}
          fullWidth
          css={css`
            width: 100%;
            height: ${textAreaHeight}px !important;
          `}
          resize="none"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="kqlFunction"
          color="accent"
          size="s"
          isDisabled={isLoading}
          onClick={() => {
            next(
              messages.concat({
                '@timestamp': new Date().toISOString(),
                message: {
                  role: MessageRole.User,
                  content: value,
                },
              })
            );
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
