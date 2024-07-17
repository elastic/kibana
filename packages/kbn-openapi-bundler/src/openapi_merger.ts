/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { basename, extname } from 'path';
import { mergeDocuments } from './bundler/merge_documents';
import { logger } from './logger';
import { createBlankOpenApiDocument } from './bundler/merge_documents/create_blank_oas_document';
import { readYamlDocument } from './utils/read_yaml_document';
import { readJsonDocument } from './utils/read_json_document';
import { ResolvedDocument } from './bundler/ref_resolver/resolved_document';
import { writeDocuments } from './utils/write_documents';
import { resolveGlobs } from './utils/resolve_globs';

export interface MergerConfig {
  sourceGlobs: string[];
  outputFilePath: string;
  mergedSpecInfo?: Partial<OpenAPIV3.InfoObject>;
}

export const merge = async ({
  sourceGlobs,
  outputFilePath = 'merged.schema.yaml',
  mergedSpecInfo,
}: MergerConfig) => {
  if (sourceGlobs.length < 1) {
    throw new Error('As minimum one source glob is expected');
  }

  logger.debug(chalk.bold(`Merging OpenAPI specs`));
  logger.debug(
    `👀  Searching for source files in ${sourceGlobs
      .map((glob) => chalk.underline(glob))
      .join(', ')}`
  );

  const schemaFilePaths = await resolveGlobs(sourceGlobs);

  logger.info(`🕵️‍♀️  Found ${schemaFilePaths.length} schemas`);
  logSchemas(schemaFilePaths);

  logger.debug(`Merging schemas...`);

  const resolvedDocuments = await resolveDocuments(schemaFilePaths);

  const blankOasDocumentFactory = (oasVersion: string) =>
    createBlankOpenApiDocument(oasVersion, {
      title: 'Merged OpenAPI specs',
      version: 'not specified',
      ...mergedSpecInfo,
    });
  const resultDocumentsMap = await mergeDocuments(resolvedDocuments, blankOasDocumentFactory, {
    splitDocumentsByVersion: false,
  });
  // Only one document is expected when `splitDocumentsByVersion` is set to `false`
  const mergedDocument = Array.from(resultDocumentsMap.values())[0];

  // An empty string key prevents adding a version to a file name
  await writeDocuments(new Map([['', mergedDocument]]), outputFilePath);
};

function logSchemas(schemaFilePaths: string[]): void {
  for (const filePath of schemaFilePaths) {
    logger.debug(`Found OpenAPI spec ${chalk.bold(filePath)}`);
  }
}

async function resolveDocuments(schemaFilePaths: string[]): Promise<ResolvedDocument[]> {
  const resolvedDocuments = await Promise.all(
    schemaFilePaths.map(async (schemaFilePath) => {
      const extension = extname(schemaFilePath);

      logger.debug(`Reading ${chalk.bold(basename(schemaFilePath))}`);

      switch (extension) {
        case '.yaml':
        case '.yml':
          return {
            absolutePath: schemaFilePath,
            document: await readYamlDocument(schemaFilePath),
          };

        case '.json':
          return {
            absolutePath: schemaFilePath,
            document: await readJsonDocument(schemaFilePath),
          };

        default:
          throw new Error(`${extension} files are not supported`);
      }
    })
  );

  return resolvedDocuments;
}
