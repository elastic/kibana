/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { BundledDocument } from '../bundle_document';
import { mergePaths } from './merge_paths';
import { mergeSharedComponents } from './merge_shared_components';

export async function mergeDocuments(
  bundledDocuments: BundledDocument[],
  blankOasFactory: (version: string) => OpenAPIV3.Document
): Promise<Map<string, OpenAPIV3.Document>> {
  const bundledDocumentsByVersion = splitByVersions(bundledDocuments);
  const mergedByVersion = new Map<string, OpenAPIV3.Document>();

  for (const [version, singleVersionBundledDocuments] of bundledDocumentsByVersion.entries()) {
    const mergedDocument = blankOasFactory(version);

    mergedDocument.paths = mergePaths(singleVersionBundledDocuments);
    mergedDocument.components = {
      ...mergedDocument.components,
      ...mergeSharedComponents(singleVersionBundledDocuments),
    };

    mergedByVersion.set(mergedDocument.info.version, mergedDocument);
  }

  return mergedByVersion;
}

function splitByVersions(bundledDocuments: BundledDocument[]): Map<string, BundledDocument[]> {
  const splitBundledDocuments = new Map<string, BundledDocument[]>();

  for (const bundledDocument of bundledDocuments) {
    const version = (bundledDocument.document.info as OpenAPIV3.InfoObject).version;
    const versionBundledDocuments = splitBundledDocuments.get(version);

    if (!versionBundledDocuments) {
      splitBundledDocuments.set(version, [bundledDocument]);
    } else {
      versionBundledDocuments.push(bundledDocument);
    }
  }

  return splitBundledDocuments;
}
