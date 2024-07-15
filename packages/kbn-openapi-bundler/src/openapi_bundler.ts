/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { isUndefined, omitBy } from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import globby from 'globby';
import { basename, dirname, resolve } from 'path';
import { BundledDocument, bundleDocument, SkipException } from './bundler/bundle_document';
import { mergeDocuments } from './bundler/merge_documents';
import { removeFilesByGlob } from './utils/remove_files_by_glob';
import { logger } from './logger';
import { writeYamlDocument } from './utils/write_yaml_document';
import { createBlankOpenApiDocument } from './bundler/merge_documents/create_blank_oas_document';

export interface BundlerConfig {
  sourceGlob: string;
  outputFilePath: string;
  options?: BundleOptions;
}

interface BundleOptions {
  includeLabels?: string[];
  specInfo?: Omit<Partial<OpenAPIV3.InfoObject>, 'version'>;
}

export const bundle = async ({
  sourceGlob,
  outputFilePath = 'bundled-{version}.schema.yaml',
  options,
}: BundlerConfig) => {
  logger.debug(chalk.bold(`Bundling API route schemas`));
  logger.debug(`👀  Searching for source files in ${chalk.underline(sourceGlob)}`);

  const sourceFilesGlob = resolve(sourceGlob);
  const schemaFilePaths = await globby([sourceFilesGlob]);

  logger.info(`🕵️‍♀️  Found ${schemaFilePaths.length} schemas`);
  logSchemas(schemaFilePaths);

  logger.info(`🧹  Cleaning up any previously generated artifacts`);
  await removeFilesByGlob(
    dirname(outputFilePath),
    basename(outputFilePath.replace('{version}', '*'))
  );

  logger.debug(`Processing schemas...`);

  const resolvedDocuments = await resolveDocuments(schemaFilePaths, options);

  logger.success(`Processed ${resolvedDocuments.length} schemas`);

  const blankOasFactory = (oasVersion: string, apiVersion: string) =>
    createBlankOpenApiDocument(oasVersion, {
      version: apiVersion,
      title: options?.specInfo?.title ?? 'Bundled OpenAPI specs',
      ...omitBy(
        {
          description: options?.specInfo?.description,
          termsOfService: options?.specInfo?.termsOfService,
          contact: options?.specInfo?.contact,
          license: options?.specInfo?.license,
        },
        isUndefined
      ),
    });
  const resultDocumentsMap = await mergeDocuments(resolvedDocuments, blankOasFactory);

  await writeDocuments(resultDocumentsMap, outputFilePath);
};

function logSchemas(schemaFilePaths: string[]): void {
  for (const filePath of schemaFilePaths) {
    logger.debug(`Found OpenAPI spec ${chalk.bold(filePath)}`);
  }
}

async function resolveDocuments(
  schemaFilePaths: string[],
  options?: BundleOptions
): Promise<BundledDocument[]> {
  const resolvedDocuments = await Promise.all(
    schemaFilePaths.map(async (schemaFilePath) => {
      try {
        const resolvedDocument = await bundleDocument(schemaFilePath, {
          includeLabels: options?.includeLabels,
        });

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

  return processedDocuments;
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

async function writeDocuments(
  resultDocumentsMap: Map<string, OpenAPIV3.Document>,
  outputFilePath: string
): Promise<void> {
  for (const [version, document] of resultDocumentsMap.entries()) {
    const versionedOutputFilePath = getVersionedOutputFilePath(outputFilePath, version);

    try {
      await writeYamlDocument(versionedOutputFilePath, document);

      logger.success(`📖  Wrote bundled OpenAPI specs to ${chalk.bold(versionedOutputFilePath)}`);
    } catch (e) {
      logger.error(
        `Unable to save bundled document to ${chalk.bold(versionedOutputFilePath)}: ${e.message}`
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

  const filename = basename(outputFilePath);

  return outputFilePath.replace(filename, `${version}-${filename}`);
}
