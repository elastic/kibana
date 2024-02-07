/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { MessageRole } from '../types';

import { ChatSidebar } from './chat_sidebar';
import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';

import { TelegramIcon } from './telegram_icon';

export const Chat = () => {
  const { euiTheme } = useEuiTheme();
  const [question, setQuestion] = React.useState('');
  const isSendButtonDisabled = !question.trim();
  const messages = [
    {
      id: 'sfs',
      role: MessageRole.system,
      content: (
        <>
          Added <EuiLink>5 indices</EuiLink> to chat context.
        </>
      ),
    },
    {
      id: 'asaqwas',
      role: MessageRole.assistant,
      createdAt: new Date(),
      content:
        'We went ahead and added your indices. You can start chatting now or modify your sources. For a deeper dive into AI Playground, review our documentation.',
    },
    {
      id: 'asdas',
      role: MessageRole.user,
      createdAt: new Date(),
      content: 'What is the average response time?',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem
        grow={2}
        css={{
          borderRight: euiTheme.border.thin,
          padding: euiTheme.size.l,
        }}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={1}>
            <MessageList messages={messages} />
          </EuiFlexItem>

          <EuiHorizontalRule margin="none" />

          <EuiFlexItem grow={false}>
            <QuestionInput
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.content.aiPlayground.questionInput.askQuestionPlaceholder',
                {
                  defaultMessage: 'Ask a question',
                }
              )}
              value={question}
              onChange={setQuestion}
              button={
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.enterpriseSearch.content.aiPlayground.sendButtonAriaLabel',
                    {
                      defaultMessage: 'Send a question',
                    }
                  )}
                  display={isSendButtonDisabled ? 'empty' : 'base'}
                  size="s"
                  type="submit"
                  isDisabled={isSendButtonDisabled}
                  iconType={TelegramIcon}
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem
        grow={1}
        css={{
          padding: euiTheme.size.l,
        }}
      >
        <ChatSidebar />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
