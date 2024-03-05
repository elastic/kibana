/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UseChatHelpers } from '@elastic/ai-assist/dist/react/index';
import { AIMessage, Message, MessageRole } from '../types';
import { Annotation, transformAnnotationToDoc } from './transformAnnotationToDoc';

export const transformFromChatMessages = (messages: UseChatHelpers['messages']): Message[] =>
  messages.map(({ id, content, createdAt, role, annotations }) => {
    const commonMessageProp = {
      id,
      content,
      createdAt,
      role: role === 'assistant' ? MessageRole.assistant : MessageRole.user,
    };

    if (role === 'assistant') {
      // @ts-ignore
      return {
        ...commonMessageProp,
        citations: Array.isArray(annotations)
          ? // @ts-ignore
            annotations
              .find((annotation) => annotation.type === 'citations')
              ?.documents?.map<Annotation>(transformAnnotationToDoc)
          : [],
        retrievalDocs: Array.isArray(annotations)
          ? // @ts-ignore
            annotations
              .find((annotation) => annotation.type === 'retrieved_docs')
              ?.documents?.map<Annotation>(transformAnnotationToDoc)
          : [],
      } as AIMessage;
    }

    return commonMessageProp;
  });
