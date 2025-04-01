/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { basename } from 'path';
import { logger } from '../logger';
import { writeYamlDocument } from './write_yaml_document';

export async function writeDocuments(
  resultDocumentsMap: Map<string, OpenAPIV3.Document>,
  outputFilePath: string
): Promise<void> {
  for (const [version, document] of resultDocumentsMap.entries()) {
    const versionedOutputFilePath = getVersionedOutputFilePath(outputFilePath, version);

    try {
      await writeYamlDocument(versionedOutputFilePath, document);

      logger.success(`📖  Wrote merged OpenAPI specs to ${chalk.bold(versionedOutputFilePath)}`);
    } catch (e) {
      logger.error(
        `Unable to save merged document to ${chalk.bold(versionedOutputFilePath)}: ${e.message}`
      );
    }
  }
}

function getVersionedOutputFilePath(outputFilePath: string, version: string): string {
  const hasVersionPlaceholder = outputFilePath.indexOf('{version}') > -1;
  const snakeCasedVersion = version.replaceAll(/[^\w\d]+/g, '_');

  if (hasVersionPlaceholder) {
    return outputFilePath.replace('{version}', snakeCasedVersion);
  }

  if (version === '') {
    return outputFilePath;
  }

  const filename = basename(outputFilePath);

  return outputFilePath.replace(filename, `${version}_${filename}`);
}
