/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { difference } from 'lodash';
import { I18nCheckTaskContext, MessageDescriptor } from '../../types';
import type { GroupedMessagesByNamespace } from './group_messages_by_namespace';

export const removeUnusedTranslations = ({
  context,
  namespacedTranslatedMessages,
  filterNamespaces,
}: {
  context: I18nCheckTaskContext;
  namespacedTranslatedMessages: GroupedMessagesByNamespace;
  filterNamespaces?: string[];
}) => {
  for (const [namespace, translatedMessages] of namespacedTranslatedMessages) {
    if (filterNamespaces) {
      const isInFilteredNamespace = filterNamespaces.find((n) => n === namespace);
      if (!isInFilteredNamespace) {
        // if not in the targeted namespace then just keep the messages as is.
        namespacedTranslatedMessages.set(namespace, translatedMessages);
        continue;
      }
    }

    const extractedMessages = context.messages.get(namespace);
    if (!extractedMessages) {
      // the whole namespace is removed from the codebase. remove from file.
      namespacedTranslatedMessages.delete(namespace);
    } else {
      const updatedMessages = removeUnusedMessages(extractedMessages, translatedMessages);
      namespacedTranslatedMessages.set(namespace, updatedMessages);
    }
  }

  return namespacedTranslatedMessages;
};

export const removeUnusedMessages = (
  extractedMessages: MessageDescriptor[],
  translationMessages: Array<[string, string]>
): Array<[string, string]> => {
  const extractedMessagesIds = [...extractedMessages].map(({ id }) => id);
  const translationMessagesIds = [...translationMessages.map(([id]) => id)];
  const unusedTranslations = difference(translationMessagesIds, extractedMessagesIds);

  if (unusedTranslations.length > 0) {
    return translationMessages.filter(([id]) => {
      const isUnused = unusedTranslations.find((unusedTranslationId) => unusedTranslationId === id);
      return !isUnused;
    });
  }

  return translationMessages;
};
