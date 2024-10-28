/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TranslationInput } from '@kbn/i18n';

// Map<namespace, [id, translatedMessage]>
export type GroupedMessagesByNamespace = Map<string, Array<[string, string | { message: string }]>>;

export function groupMessagesByNamespace(
  translationInput: TranslationInput,
  knownNamespaces: string[]
): GroupedMessagesByNamespace {
  const localizedMessagesByNamespace: GroupedMessagesByNamespace = new Map();
  for (const [messageId, messageValue] of Object.entries(translationInput.messages)) {
    const namespace = knownNamespaces.find((key) => messageId.startsWith(`${key}.`));
    if (!namespace) {
      continue;
    }

    if (!localizedMessagesByNamespace.has(namespace)) {
      localizedMessagesByNamespace.set(namespace, []);
    }

    localizedMessagesByNamespace
      .get(namespace)!
      .push([
        messageId,
        { message: typeof messageValue === 'string' ? messageValue : messageValue.text },
      ]);
  }

  return localizedMessagesByNamespace;
}
