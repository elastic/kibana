/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFile as readFileAsync } from 'fs/promises';
import { MessageDescriptor } from '../../extractors/call_expt';
import {
  extractI18nMessageDescriptors,
  verifyMessageDescriptor,
  verifyMessageIdStartsWithNamespace,
} from '../../formatjs/runner';
import { globNamespacePaths } from '../../utils';

const descriptorDetailsStack = (messageDescriptor: MessageDescriptor, namespaceRoot: string) => {
  return `
id: ${messageDescriptor.id}
message: ${messageDescriptor.defaultMessage}
file: ${messageDescriptor.file}
namespace: ${namespaceRoot}
`;
};

const validateFile = ({
  extractedMessages,
  namespace,
  filePath,
}: {
  extractedMessages: Map<string, MessageDescriptor>;
  namespace: string;
  filePath: string;
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
const formatJsRunner = async (filePaths: string[], namespace: string) => {
  const allNamespaceMessages = new Map();
  for (const filePath of filePaths) {
    const source = await readFileAsync(filePath, 'utf8');
    const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

    validateFile({
      extractedMessages,
      filePath,
      namespace,
    });

    extractedMessages.forEach((extractedMessage) => {
      if (allNamespaceMessages.has(extractedMessage.id)) {
        throw new Error(
          `Found duplicate i18n message id in files:\n- ${extractedMessage.file}\n- ${
            allNamespaceMessages.get(extractedMessage.id).file
          }`
        );
      }

      allNamespaceMessages.set(extractedMessage.id, extractedMessage);
    });
  }

  return allNamespaceMessages;
};

export const runForNamespacePath = async (namespace: string, namespaceRoots: string[]) => {
  const namespacePaths = await globNamespacePaths(namespaceRoots);
  const allNamespaceMessages = await formatJsRunner(namespacePaths, namespace);

  return allNamespaceMessages;
};
