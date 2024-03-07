/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCommentList } from '@elastic/eui';

import { AIMessage, Message, MessageRole } from '../../../types';

import { AssistantMessage } from './assistant_message';
import { SystemMessage } from './system_message';
import { UserMessage } from './user_message';

interface MessageListProps {
  messages: Message[];
}

const mapRoleToMessageComponent = {
  [MessageRole.system]: (message: Message) => <SystemMessage content={message.content} />,
  [MessageRole.user]: (message: Message) => (
    <UserMessage content={message.content} createdAt={message.createdAt} />
  ),
  [MessageRole.assistant]: (message: Message) => (
    <AssistantMessage
      content={message.content}
      createdAt={message.createdAt}
      citations={(message as AIMessage).citations}
      retrievalDocs={(message as AIMessage).retrievalDocs}
    />
  ),
};

export const MessageList: React.FC<MessageListProps> = ({ messages }) => (
  <EuiCommentList gutterSize="m">
    {messages.map((message) => (
      <React.Fragment key={message.id}>
        {mapRoleToMessageComponent[message.role](message)}
      </React.Fragment>
    ))}
  </EuiCommentList>
);
