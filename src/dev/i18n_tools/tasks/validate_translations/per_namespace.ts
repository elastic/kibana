/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFile as readFileAsync } from 'fs/promises';
import { diffStrings } from '@kbn/dev-utils';
import { MessageDescriptor } from '../../extractors/call_expt';
import {
  extractI18nMessageDescriptors,
  verifyMessageDescriptor,
  verifyMessageIdStartsWithNamespace,
} from '../../extractors/formatjs';
import { globNamespacePaths, descriptorDetailsStack, ErrorReporter } from '../../utils';

export const validateMessages = ({
  extractedMessages,
  namespace,
}: {
  extractedMessages: Map<string, MessageDescriptor>;
  namespace: string;
}) => {
  for (const [, messageDescriptor] of extractedMessages) {
    const validId = verifyMessageIdStartsWithNamespace(messageDescriptor, namespace);
    if (!validId) {
      const errorDetailsStack = descriptorDetailsStack(messageDescriptor, namespace);
      throw new Error(
        `Error in file Message id ${messageDescriptor.id} must start with the namespace root (${namespace}) defined in the .i18nrc.json file. ${errorDetailsStack}`
      );
    }

    try {
      verifyMessageDescriptor(messageDescriptor.defaultMessage!, messageDescriptor);
    } catch (err) {
      // :${err.location?.start.column}:${err.location?.start.offset}
      const errorDetailsStack = descriptorDetailsStack(messageDescriptor, namespace);
      throw new Error(`Failed to verify message: ${errorDetailsStack}. Got ${err}`);
    }
  }
};

const formatJsRunner = async (
  filePaths: string[],
  namespace: string,
  errorReporter: ErrorReporter,
  ignoreFlags: { ignoreMalformed?: boolean }
) => {
  const allNamespaceMessages = new Map();
  const { ignoreMalformed } = ignoreFlags;
  for (const filePath of filePaths) {
    const source = await readFileAsync(filePath, 'utf8');
    const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

    try {
      validateMessages({
        extractedMessages,
        namespace,
      });
    } catch (err) {
      if (!ignoreMalformed) {
        throw err;
      }
    }

    extractedMessages.forEach((extractedMessage) => {
      if (allNamespaceMessages.has(extractedMessage.id)) {
        const mismatchMessage =
          allNamespaceMessages.get(extractedMessage.id).defaultMessage !==
          extractedMessage.defaultMessage;

        if (mismatchMessage) {
          const excpectedDescriptor = allNamespaceMessages.get(extractedMessage.id);
          const expectedMessage = excpectedDescriptor.defaultMessage;
          const receivedMessage = `${extractedMessage.defaultMessage}`;

          const diffOutput = diffStrings(expectedMessage, receivedMessage);

          errorReporter.report(
            `Found duplicate i18n message id with mismatching defaultMessages in files:\n- ${extractedMessage.file}\n- ${excpectedDescriptor.file}\nMessage id: ${extractedMessage.id}\nNamespace: ${namespace}\n${diffOutput}`
          );
        }
      }

      allNamespaceMessages.set(extractedMessage.id, extractedMessage);
    });

    if (errorReporter.hasErrors()) {
      throw errorReporter.throwErrors();
    }
  }

  return allNamespaceMessages;
};

export const runForNamespacePath = async (
  namespace: string,
  namespaceRoots: string[],
  errorReporter: ErrorReporter,
  ignoreFlags: { ignoreMalformed?: boolean }
) => {
  const namespacePaths = await globNamespacePaths(namespaceRoots);
  const allNamespaceMessages = await formatJsRunner(
    namespacePaths,
    namespace,
    errorReporter,
    ignoreFlags
  );

  return allNamespaceMessages;
};
