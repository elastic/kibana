/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';

import { mergeDocuments } from './bundler/merge_documents';
import { logger } from './logger';
import { createBlankOpenApiDocument } from './bundler/merge_documents/create_blank_oas_document';
import { ResolvedDocument } from './bundler/ref_resolver/resolved_document';
import { writeDocuments } from './utils/write_documents';
import { resolveGlobs } from './utils/resolve_globs';
import { bundleDocument } from './bundler/bundle_document';
import { withNamespaceComponentsProcessor } from './bundler/processor_sets';
import { PrototypeDocument } from './prototype_document';
import { validatePrototypeDocument } from './validate_prototype_document';

export interface MergerConfig {
  sourceGlobs: string[];
  outputFilePath: string;
  options?: MergerOptions;
}

interface MergerOptions {
  /**
   * OpenAPI document itself or path to the document
   */
  prototypeDocument?: PrototypeDocument | string;
}

export const merge = async ({
  sourceGlobs,
  outputFilePath = 'merged.schema.yaml',
  options,
}: MergerConfig) => {
  if (sourceGlobs.length < 1) {
    throw new Error('As minimum one source glob is expected');
  }

  const prototypeDocument = options?.prototypeDocument
    ? await validatePrototypeDocument(options?.prototypeDocument)
    : undefined;

  logger.info(chalk.bold(`Merging OpenAPI specs`));
  logger.info(
    `👀  Searching for source files in ${sourceGlobs
      .map((glob) => chalk.underline(glob))
      .join(', ')}`
  );

  const schemaFilePaths = await resolveGlobs(sourceGlobs);

  logger.info(`🕵️‍♀️  Found ${schemaFilePaths.length} schemas`);
  logSchemas(schemaFilePaths);

  logger.info(`Merging schemas...`);

  const bundledDocuments = await bundleDocuments(schemaFilePaths);

  const blankOasDocumentFactory = (oasVersion: string) =>
    createBlankOpenApiDocument(oasVersion, {
      info: prototypeDocument?.info ? { ...DEFAULT_INFO, ...prototypeDocument.info } : DEFAULT_INFO,
      servers: prototypeDocument?.servers,
      security: prototypeDocument?.security,
      components: {
        securitySchemes: prototypeDocument?.components?.securitySchemes,
      },
    });

  const resultDocumentsMap = await mergeDocuments(bundledDocuments, blankOasDocumentFactory, {
    splitDocumentsByVersion: false,
    skipServers: Boolean(prototypeDocument?.servers),
    skipSecurity: Boolean(prototypeDocument?.security),
    addTags: prototypeDocument?.tags,
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

async function bundleDocuments(schemaFilePaths: string[]): Promise<ResolvedDocument[]> {
  return await Promise.all(
    schemaFilePaths.map(async (schemaFilePath) =>
      bundleDocument(schemaFilePath, withNamespaceComponentsProcessor([], '/info/title'))
    )
  );
}

const DEFAULT_INFO = {
  title: 'Merged OpenAPI specs',
  version: 'not specified',
} as const;
