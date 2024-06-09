/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nCheckTaskContext, MessageDescriptor } from '../../types';
import { verifyMessageDescriptor } from '../../formatjs/runner';
import type { GroupedMessagesByNamespace } from './group_messages_by_namespace';
export const removeOutdatedTranslations = ({
  context,
  namespacedTranslatedMessages,
}: {
  context: I18nCheckTaskContext;
  namespacedTranslatedMessages: GroupedMessagesByNamespace;
}) => {
  for (const [namespace, translatedMessages] of namespacedTranslatedMessages) {
    const extractedMessages = context.messages.get(namespace);
    if (!extractedMessages) {
      // the whole namespace is removed from the codebase. remove from file.
      namespacedTranslatedMessages.delete(namespace);
    } else {
      const updatedMessages = removeOutdatedMessages(extractedMessages, translatedMessages);
      namespacedTranslatedMessages.set(namespace, updatedMessages);
    }
  }

  return namespacedTranslatedMessages;
};

export const removeOutdatedMessages = (
  extractedMessages: MessageDescriptor[],
  translationMessages: Array<[string, string]>
): Array<[string, string]> => {
  return translationMessages.filter(([translatedId, translatedMessage]) => {
    const messageDescriptor = extractedMessages.find(({ id }) => id === translatedId);
    if (!messageDescriptor?.hasValuesObject) {
      return true;
    }
    try {
      verifyMessageDescriptor(translatedMessage, messageDescriptor);
      return true;
    } catch (err) {
      // failed to verify message against latest descriptor. remove from file.
      return false;
    }
  });
};
