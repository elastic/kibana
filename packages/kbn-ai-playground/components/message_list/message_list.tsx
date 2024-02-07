/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCommentList } from '@elastic/eui';

import { Message, MessageRole } from '../../types';

import { AssistantMessage } from './assistant_message';
import { SystemMessage } from './system_message';
import { UserMessage } from './user_message';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const mapRoleToMessageComponent = {
    [MessageRole.system]: (message: Message) => <SystemMessage content={message.content} />,
    [MessageRole.user]: (message: Message) => (
      <UserMessage content={message.content} createdAt={message.createdAt} />
    ),
    [MessageRole.assistant]: (message: Message) => (
      <AssistantMessage content={message.content} createdAt={message.createdAt} />
    ),
  };

  return (
    <EuiCommentList gutterSize="m">
      {messages.map((message) => (
        <React.Fragment key={message.id}>
          {mapRoleToMessageComponent[message.role](message)}
        </React.Fragment>
      ))}
    </EuiCommentList>
  );
};
