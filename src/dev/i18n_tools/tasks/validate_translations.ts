/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFailError } from '@kbn/dev-cli-errors';
import chalk from 'chalk';
import { readFile as readFileAsync } from 'fs/promises';
import { PRESET_TIMER } from 'listr2';
import { extractI18nMessageDescriptors, verifyMessageDescriptor } from '../formatjs/runner';
import { globNamespacePaths } from '../utils';
import { TaskSignature } from '../types';

export const runForNamespacePath = async (namespaceRoots: string[]) => {
  let messagesCount = 0;
  for (const namespaceRoot of namespaceRoots) {
    const namespacePaths = await globNamespacePaths(namespaceRoot, {
      additionalIgnore: ['src/esql_documentation_sections.tsx'],
    });
    const namespacePathLabelsCount = await formatJsRunner(namespacePaths, namespaceRoot);
    messagesCount += namespacePathLabelsCount;
  }
  return messagesCount;
};

export const formatJsRunner = async (filePaths: string[], namespaceRoot: string) => {
  let messagesCount = 0;
  for (const filePath of filePaths) {
    const source = await readFileAsync(filePath, 'utf8');
    const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

    extractedMessages.forEach((messageDescriptor) => {
      try {
        const verificationResults = verifyMessageDescriptor(messageDescriptor);
      } catch (err) {
        // :${err.location?.start.column}:${err.location?.start.offset}
        throw new Error(
          `Failed to verify message:
id: ${messageDescriptor.id}
message: ${messageDescriptor.defaultMessage}
file: ${messageDescriptor.file}
namespace: ${namespaceRoot}
Got ${err}`
        );
      }
    });

    messagesCount += extractedMessages.size;
  }
  return messagesCount;
};

export const validateTranslationsTask: TaskSignature<{}> = (context, task, options) => {
  const { config } = context;
  if (!config) {
    throw createFailError(
      `${chalk.white.bgRed(
        ' I18N ERROR '
      )} None of input paths is covered by the mappings in .i18nrc.json.`
    );
  }

  // if (!config.paths.length) {
  //   throw createFailError(
  //     `${chalk.white.bgRed(
  //       ' I18N ERROR '
  //     )} No tasks defined. .i18nrc.json has no namespaces defined.`
  //   );
  // }

  return task.newListr(
    (parent) => [
      {
        task: async () => {
          const namespacesDetails = Object.entries(config.paths);
          let iter = 1;
          for (const [namespace, namespacePaths] of namespacesDetails) {
            parent.title = `[${iter}/${namespacesDetails.length}] Verifying i18n messages inside ${namespace} namespace`;
            const messagesCount = await runForNamespacePath(namespacePaths);
            const countMessage = `Successfully vefified Namespace ${namespace} with ${messagesCount} defined i18n messages.`;
            task.output = countMessage;
            iter++;
          }
        },
      },
    ],
    { exitOnError: true, rendererOptions: { timer: PRESET_TIMER }, collectErrors: 'full' }
  );
};
