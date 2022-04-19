/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { i18n } from '@kbn/i18n';
import path from 'path';

import { createFailError } from '@kbn/dev-utils';
import {
  accessAsync,
  checkValuesProperty,
  difference,
  extractValueReferencesFromMessage,
  makeDirAsync,
  normalizePath,
  readFileAsync,
  writeFileAsync,
  verifyICUMessage,
} from './utils';

import { I18nConfig } from './config';
import { serializeToJson } from './serializers';

export interface IntegrateOptions {
  sourceFileName: string;
  targetFileName?: string;
  dryRun: boolean;
  ignoreMalformed: boolean;
  ignoreIncompatible: boolean;
  ignoreUnused: boolean;
  ignoreMissing: boolean;
  config: I18nConfig;
  log: ToolingLog;
}

type MessageMap = Map<string, { message: string }>;
type GroupedMessageMap = Map<string, Array<[string, { message: string }]>>;
type LocalizedMessageMap = Map<string, string | { text: string }>;

export function verifyMessages(
  localizedMessagesMap: LocalizedMessageMap,
  defaultMessagesMap: MessageMap,
  options: IntegrateOptions
) {
  let errorMessage = '';

  const defaultMessagesIds = [...defaultMessagesMap.keys()];
  const localizedMessagesIds = [...localizedMessagesMap.keys()];

  const unusedTranslations = difference(localizedMessagesIds, defaultMessagesIds);
  if (unusedTranslations.length > 0) {
    if (!options.ignoreUnused) {
      errorMessage += `\n${
        unusedTranslations.length
      } unused translation(s):\n${unusedTranslations.join(', ')}`;
    } else {
      for (const unusedTranslationId of unusedTranslations) {
        localizedMessagesMap.delete(unusedTranslationId);
      }
    }
  }

  if (!options.ignoreMissing) {
    const missingTranslations = difference(defaultMessagesIds, localizedMessagesIds);
    if (missingTranslations.length > 0) {
      errorMessage += `\n${
        missingTranslations.length
      } missing translation(s):\n${missingTranslations.join(', ')}`;
    }
  }

  for (const messageId of localizedMessagesIds) {
    const defaultMessage = defaultMessagesMap.get(messageId);
    if (defaultMessage) {
      try {
        const message = localizedMessagesMap.get(messageId)!;
        checkValuesProperty(
          extractValueReferencesFromMessage(defaultMessage.message, messageId),
          typeof message === 'string' ? message : message.text,
          messageId
        );
      } catch (err) {
        if (options.ignoreIncompatible) {
          localizedMessagesMap.delete(messageId);
          options.log.warning(`Incompatible translation ignored: ${err.message}`);
        } else {
          errorMessage += `\nIncompatible translation: ${err.message}\n`;
        }
      }
    }
  }

  for (const messageId of localizedMessagesIds) {
    const defaultMessage = defaultMessagesMap.get(messageId);
    if (defaultMessage) {
      try {
        const message = localizedMessagesMap.get(messageId)!;
        verifyICUMessage(typeof message === 'string' ? message : message?.text);
      } catch (err) {
        if (options.ignoreMalformed) {
          localizedMessagesMap.delete(messageId);
          options.log.warning(`Malformed translation ignored (${messageId}): ${err}`);
        } else {
          errorMessage += `\nMalformed translation (${messageId}): ${err}\n`;
        }
      }
    }
  }

  if (errorMessage) {
    throw createFailError(errorMessage);
  }
}

function groupMessagesByNamespace(
  localizedMessagesMap: LocalizedMessageMap,
  knownNamespaces: string[]
) {
  const localizedMessagesByNamespace = new Map();
  for (const [messageId, messageValue] of localizedMessagesMap) {
    const namespace = knownNamespaces.find((key) => messageId.startsWith(`${key}.`));
    if (!namespace) {
      throw createFailError(`Unknown namespace in id ${messageId}.`);
    }

    if (!localizedMessagesByNamespace.has(namespace)) {
      localizedMessagesByNamespace.set(namespace, []);
    }

    localizedMessagesByNamespace
      .get(namespace)
      .push([
        messageId,
        { message: typeof messageValue === 'string' ? messageValue : messageValue.text },
      ]);
  }

  return localizedMessagesByNamespace;
}

async function writeMessages(
  localizedMessagesByNamespace: GroupedMessageMap,
  formats: typeof i18n.formats,
  options: IntegrateOptions
) {
  // If target file name is specified we need to write all the translations into one file,
  // irrespective to the namespace.
  if (options.targetFileName) {
    await writeFileAsync(
      options.targetFileName,
      serializeToJson(
        [...localizedMessagesByNamespace.values()].reduce((acc, val) => acc.concat(val), []),
        formats
      )
    );

    return options.log.success(
      `Translations have been integrated to ${normalizePath(options.targetFileName)}`
    );
  }

  // Use basename of source file name to write the same locale name as the source file has.
  const fileName = path.basename(options.sourceFileName);
  for (const [namespace, messages] of localizedMessagesByNamespace) {
    for (const namespacedPath of options.config.paths[namespace]) {
      const destPath = path.resolve(namespacedPath, 'translations');

      try {
        await accessAsync(destPath);
      } catch (_) {
        await makeDirAsync(destPath);
      }

      const writePath = path.resolve(destPath, fileName);
      await writeFileAsync(writePath, serializeToJson(messages, formats));
      options.log.success(`Translations have been integrated to ${normalizePath(writePath)}`);
    }
  }
}

export async function integrateLocaleFiles(
  defaultMessagesMap: MessageMap,
  options: IntegrateOptions
) {
  const localizedMessages = JSON.parse((await readFileAsync(options.sourceFileName)).toString());
  if (!localizedMessages.formats) {
    throw createFailError(`Locale file should contain formats object.`);
  }

  const localizedMessagesMap: LocalizedMessageMap = new Map(
    Object.entries(localizedMessages.messages)
  );
  verifyMessages(localizedMessagesMap, defaultMessagesMap, options);

  const knownNamespaces = Object.keys(options.config.paths);
  const groupedLocalizedMessagesMap = groupMessagesByNamespace(
    localizedMessagesMap,
    knownNamespaces
  );

  if (!options.dryRun) {
    await writeMessages(groupedLocalizedMessagesMap, localizedMessages.formats, options);
  }
}
