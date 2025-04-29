/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { I18nCheckTaskContext, MessageDescriptor } from '../../types';
import { verifyMessageDescriptor } from '../../extractors/formatjs';
import type { GroupedMessagesByNamespace } from './group_messages_by_namespace';
import { TaskReporter } from '../../utils/task_reporter';
import { ErrorReporter } from '../../utils';
export const removeOutdatedTranslations = ({
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
      namespacedTranslatedMessages.delete(namespace);
      taskReporter.log(`The whole namespace ${namespace} has been removed from the codebase.`);
    } else {
      const { updatedMessages, outdatedMessages } = removeOutdatedMessages(
        extractedMessages,
        translatedMessages
      );

      outdatedMessages.forEach((outdatedMessage) => {
        const message = `Found incompatible message with id ${outdatedMessage[0]}.`;
        taskReporter.log(message);
        errorReporter.report(message);
      });

      namespacedTranslatedMessages.set(namespace, updatedMessages);
    }
  }

  return namespacedTranslatedMessages;
};

const removeOutdatedMessages = (
  extractedMessages: MessageDescriptor[],
  translationMessages: Array<[string, string | { message: string }]>
): Record<
  'outdatedMessages' | 'updatedMessages',
  Array<[string, string | { message: string }]>
> => {
  return translationMessages.reduce(
    (acc, [translatedId, translatedMessage]) => {
      const messageDescriptor = extractedMessages.find(({ id }) => id === translatedId);
      // removed from codebase
      if (!messageDescriptor) {
        acc.outdatedMessages.push([translatedId, translatedMessage]);
        return acc;
      }

      try {
        verifyMessageDescriptor(
          typeof translatedMessage === 'string' ? translatedMessage : translatedMessage.message,
          messageDescriptor
        );
        acc.updatedMessages.push([translatedId, translatedMessage]);
      } catch (err) {
        // failed to verify message against latest descriptor. remove from file.
        acc.outdatedMessages.push([translatedId, translatedMessage]);
      }

      return acc;
    },
    { updatedMessages: [], outdatedMessages: [] } as Record<
      'outdatedMessages' | 'updatedMessages',
      Array<[string, string | { message: string }]>
    >
  );
};
