/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile as readFileAsync } from 'fs/promises';
import { extractI18nMessageDescriptors } from '../../extractors/formatjs';
import { globNamespacePaths } from '../../utils';

const formatJsRunner = async (filePaths: string[]) => {
  const allNamespaceMessages = new Map();
  for (const filePath of filePaths) {
    const source = await readFileAsync(filePath, 'utf8');
    const extractedMessages = await extractI18nMessageDescriptors(filePath, source);

    extractedMessages.forEach((extractedMessage) => {
      allNamespaceMessages.set(extractedMessage.id, extractedMessage);
    });
  }

  return allNamespaceMessages;
};

export const runForNamespacePath = async (namespaceRoots: string[]) => {
  const namespacePaths = await globNamespacePaths(namespaceRoots);
  const allNamespaceMessages = await formatJsRunner(namespacePaths);

  return allNamespaceMessages;
};
