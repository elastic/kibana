/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
              .find((annotation) => annotation['type'] === 'citations')
              ?.['documents']?.map<Annotation>(transformAnnotationToDoc)
          : [],
        retrievalDocs: Array.isArray(annotations)
          ? // @ts-ignore
            annotations
              .find((annotation) => annotation['type'] === 'retrieval_doc')
              ?.['documents']?.map<Annotation>(transformAnnotationToDoc)
          : [],
      } as AIMessage;
    }

    return commonMessageProp;
  });
