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
import { basename, dirname } from 'path';
import { bundleDocument, SkipException } from './bundler/bundle_document';
import { mergeDocuments } from './bundler/merge_documents';
import { removeFilesByGlob } from './utils/remove_files_by_glob';
import { logger } from './logger';
import { createBlankOpenApiDocument } from './bundler/merge_documents/create_blank_oas_document';
import { writeDocuments } from './utils/write_documents';
import { ResolvedDocument } from './bundler/ref_resolver/resolved_document';
import { resolveGlobs } from './utils/resolve_globs';
import { DEFAULT_BUNDLING_PROCESSORS, withIncludeLabelsProcessor } from './bundler/processor_sets';

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

  const schemaFilePaths = await resolveGlobs([sourceGlob]);

  logger.info(`🕵️‍♀️  Found ${schemaFilePaths.length} schemas`);
  logSchemas(schemaFilePaths);

  logger.info(`🧹  Cleaning up any previously generated artifacts`);
  await removeFilesByGlob(
    dirname(outputFilePath),
    basename(outputFilePath.replace('{version}', '*'))
  );

  logger.debug(`Processing schemas...`);

  const bundledDocuments = await bundleDocuments(schemaFilePaths, options);

  logger.success(`Processed ${bundledDocuments.length} schemas`);

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
  const resultDocumentsMap = await mergeDocuments(bundledDocuments, blankOasFactory, {
    splitDocumentsByVersion: true,
  });

  await writeDocuments(resultDocumentsMap, outputFilePath);
};

function logSchemas(schemaFilePaths: string[]): void {
  for (const filePath of schemaFilePaths) {
    logger.debug(`Found OpenAPI spec ${chalk.bold(filePath)}`);
  }
}

async function bundleDocuments(
  schemaFilePaths: string[],
  options?: BundleOptions
): Promise<ResolvedDocument[]> {
  const resolvedDocuments = await Promise.all(
    schemaFilePaths.map(async (schemaFilePath) => {
      try {
        const resolvedDocument = await bundleDocument(
          schemaFilePath,
          options?.includeLabels
            ? withIncludeLabelsProcessor(DEFAULT_BUNDLING_PROCESSORS, options.includeLabels)
            : DEFAULT_BUNDLING_PROCESSORS
        );

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
  documents: Array<ResolvedDocument | undefined>
): ResolvedDocument[] {
  const processedDocuments: ResolvedDocument[] = [];

  for (const document of documents) {
    if (!document) {
      continue;
    }

    processedDocuments.push(document);
  }

  return processedDocuments;
}
