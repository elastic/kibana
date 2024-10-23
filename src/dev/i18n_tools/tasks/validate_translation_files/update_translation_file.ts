/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFile as writeFileAsync } from 'fs/promises';

import { Formats } from '@kbn/i18n';
import { serializeToJson } from '../../serializers';

import type { GroupedMessagesByNamespace } from './group_messages_by_namespace';
import { makeAbsolutePath } from '../../utils';

interface TranslationFileDetails {
  namespacedTranslatedMessages: GroupedMessagesByNamespace;
  targetFilePath: string;
  formats?: Formats;
}

export async function updateTranslationFile({
  namespacedTranslatedMessages,
  formats,
  targetFilePath,
}: TranslationFileDetails) {
  try {
    const sortedMessages = [...namespacedTranslatedMessages.values()]
      .flat()
      .map(([id, details]) => {
        return {
          id,
          defaultMessage: typeof details === 'string' ? details : details.message,
        };
      })
      .sort(({ id: key1 }, { id: key2 }) => key1.localeCompare(key2));

    const fileJsonContent = serializeToJson(sortedMessages, formats);
    await writeFileAsync(makeAbsolutePath(targetFilePath), fileJsonContent);
  } catch (err) {
    throw err;
  }
}
