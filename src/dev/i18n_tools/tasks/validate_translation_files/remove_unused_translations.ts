/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { difference } from 'lodash';
import { I18nCheckTaskContext, MessageDescriptor } from '../../types';
import { ErrorReporter } from '../../utils';
import { TaskReporter } from '../../utils/task_reporter';
import type { GroupedMessagesByNamespace } from './group_messages_by_namespace';

export const removeUnusedTranslations = ({
  context,
  namespacedTranslatedMessages,
  filterNamespaces,
  taskReporter,
  errorReporter,
}: {
  context: I18nCheckTaskContext;
  namespacedTranslatedMessages: GroupedMessagesByNamespace;
  filterNamespaces?: string[];
  taskReporter: TaskReporter;
  errorReporter: ErrorReporter;
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
      taskReporter.log(`The whole namespace ${namespace} has been removed from the codebase.`);
      namespacedTranslatedMessages.delete(namespace);
    } else {
      const { updatedMessages, unusedMessages } = removeUnusedMessages(
        extractedMessages,
        translatedMessages
      );

      unusedMessages.forEach((unusedMessage) => {
        const message = `Found no longer used message with id ${unusedMessage[0]}.`;
        taskReporter.log(message);
        errorReporter.report(message);
      });

      namespacedTranslatedMessages.set(namespace, updatedMessages);
    }
  }

  return namespacedTranslatedMessages;
};

const removeUnusedMessages = (
  extractedMessages: MessageDescriptor[],
  translationMessages: Array<[string, string | { message: string }]>
): Record<'unusedMessages' | 'updatedMessages', Array<[string, string | { message: string }]>> => {
  const extractedMessagesIds = [...extractedMessages].map(({ id }) => id);
  const translationMessagesIds = [...translationMessages.map(([id]) => id)];
  const unusedTranslations = difference(translationMessagesIds, extractedMessagesIds);
  const unusedMessages: Array<[string, string | { message: string }]> = [];
  let updatedMessages = translationMessages;

  if (unusedTranslations.length > 0) {
    updatedMessages = translationMessages.filter(([id]) => {
      const unusedMessage = unusedTranslations.find(
        (unusedTranslationId) => unusedTranslationId === id
      );
      if (unusedMessage) {
        unusedMessages.push([id, unusedMessage]);
      }
      return !unusedMessage;
    });
  }

  return { updatedMessages, unusedMessages };
};
