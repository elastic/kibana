/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { logger } from '../../logger';
import { BundledDocument } from '../bundle_document';
import { mergePaths } from './merge_paths';
import { mergeSharedComponents } from './merge_shared_components';

export async function mergeDocuments(
  bundledDocuments: BundledDocument[],
  blankOasFactory: (oasVersion: string, apiVersion: string) => OpenAPIV3.Document
): Promise<Map<string, OpenAPIV3.Document>> {
  const bundledDocumentsByVersion = splitByVersion(bundledDocuments);
  const mergedByVersion = new Map<string, OpenAPIV3.Document>();

  for (const [apiVersion, singleVersionBundledDocuments] of bundledDocumentsByVersion.entries()) {
    const oasVersion = extractOasVersion(singleVersionBundledDocuments);
    const mergedDocument = blankOasFactory(oasVersion, apiVersion);

    mergedDocument.paths = mergePaths(singleVersionBundledDocuments);
    mergedDocument.components = {
      // Copy components defined in the blank OpenAPI document
      ...mergedDocument.components,
      ...mergeSharedComponents(singleVersionBundledDocuments),
    };

    mergedByVersion.set(mergedDocument.info.version, mergedDocument);
  }

  return mergedByVersion;
}

function splitByVersion(bundledDocuments: BundledDocument[]): Map<string, BundledDocument[]> {
  const splitBundledDocuments = new Map<string, BundledDocument[]>();

  for (const bundledDocument of bundledDocuments) {
    const documentInfo = bundledDocument.document.info as OpenAPIV3.InfoObject;

    if (!documentInfo.version) {
      logger.warning(`OpenAPI version is missing in ${chalk.bold(bundledDocument.absolutePath)}`);

      continue;
    }

    const versionBundledDocuments = splitBundledDocuments.get(documentInfo.version);

    if (!versionBundledDocuments) {
      splitBundledDocuments.set(documentInfo.version, [bundledDocument]);
    } else {
      versionBundledDocuments.push(bundledDocument);
    }
  }

  return splitBundledDocuments;
}

function extractOasVersion(bundledDocuments: BundledDocument[]): string {
  if (bundledDocuments.length === 0) {
    throw new Error('Empty bundled document list');
  }

  const firstBundledDocument = bundledDocuments[0];

  for (let i = 1; i < bundledDocuments.length; ++i) {
    if (
      !areOasVersionsEqual(
        bundledDocuments[i].document.openapi as string,
        firstBundledDocument.document.openapi as string
      )
    ) {
      throw new Error(
        `OpenAPI specs must use the same OpenAPI version, encountered ${chalk.blue(
          bundledDocuments[i].document.openapi
        )} at ${chalk.bold(bundledDocuments[i].absolutePath)} does not match ${chalk.blue(
          firstBundledDocument.document.openapi
        )} at ${chalk.bold(firstBundledDocument.absolutePath)}`
      );
    }
  }

  const version = firstBundledDocument.document.openapi as string;

  // Automatically promote to the recent OAS 3.0 version which is 3.0.3
  // 3.0.3 is the version used in the specification https://swagger.io/specification/v3/
  return version < '3.0.3' ? '3.0.3' : version;
}

/**
 * Tells if versions are equal by comparing only major and minor OAS version parts
 */
function areOasVersionsEqual(versionA: string, versionB: string): boolean {
  // versionA.substring(0, 3) results in `3.0` or `3.1`
  return versionA.substring(0, 3) === versionB.substring(0, 3);
}
