/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import globby from 'globby';
import { basename, dirname, join, resolve } from 'path';
import { BundledDocument, bundleDocument, SkipException } from './bundler/bundle_document';
import { mergeDocuments } from './bundler/merge_documents';
import { removeFilesByGlob } from './utils/remove_files_by_glob';
import { logger } from './logger';
import { writeYamlDocument } from './utils/write_yaml_document';

export interface BundlerConfig {
  rootDir: string;
  sourceGlob: string;
  outputFilePath: string;
}

export const bundle = async (config: BundlerConfig) => {
  const {
    rootDir,
    sourceGlob,
    outputFilePath: relativeOutputFilePath = 'target/openapi/bundled.schema.yaml',
  } = config;

  logger.debug(chalk.bold(`Bundling API route schemas`));
  logger.debug(chalk.bold(`Working directory: ${chalk.underline(rootDir)}`));
  logger.debug(`👀  Searching for source files`);

  const outputFilePath = join(rootDir, relativeOutputFilePath);
  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const schemaFilePaths = await globby([sourceFilesGlob]);

  logger.info(`🕵️‍♀️  Found ${schemaFilePaths.length} schemas`);
  logSchemas(schemaFilePaths);

  logger.info(`🧹  Cleaning up any previously generated artifacts`);
  await removeFilesByGlob(dirname(outputFilePath), basename(outputFilePath));

  logger.debug(`Processing schemas...`);

  const resolvedDocuments = await Promise.all(
    schemaFilePaths.map(async (schemaFilePath) => {
      try {
        const resolvedDocument = await bundleDocument(schemaFilePath);

        logger.debug(`Processed ${chalk.bold(basename(schemaFilePath))}`);

        return resolvedDocument;
      } catch (e) {
        if (e instanceof SkipException) {
          logger.info(`Skipped ${chalk.bold(e.documentPath)}: ${e.message}`);
          return;
        }

        throw e;
      }
    })
  );

  const processedDocuments = filterOutSkippedDocuments(resolvedDocuments);

  logger.success(`Processed ${processedDocuments.length} schemas`);

  const resultDocument = await mergeDocuments(processedDocuments);

  try {
    await writeYamlDocument(outputFilePath, resultDocument);

    logger.success(`📖  Wrote all bundled OpenAPI specs to ${chalk.bold(outputFilePath)}`);
  } catch (e) {
    logger.error(`Unable to save bundled document to ${chalk.bold(outputFilePath)}: ${e.message}`);
  }
};

function logSchemas(schemaFilePaths: string[]): void {
  for (const filePath of schemaFilePaths) {
    logger.debug(`Found OpenAPI spec ${chalk.bold(filePath)}`);
  }
}

function filterOutSkippedDocuments(
  documents: Array<BundledDocument | undefined>
): BundledDocument[] {
  const processedDocuments: BundledDocument[] = [];

  for (const document of documents) {
    if (!document) {
      continue;
    }

    processedDocuments.push(document);
  }

  return processedDocuments;
}
