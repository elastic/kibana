/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { ResolvedDocument } from '../ref_resolver/resolved_document';
import { mergePaths } from './merge_paths';
import { mergeSharedComponents } from './merge_shared_components';
import { mergeServers } from './merge_servers';
import { mergeSecurityRequirements } from './merge_security_requirements';
import { mergeTags } from './merge_tags';
import { getOasVersion } from '../../utils/get_oas_version';
import { getOasDocumentVersion } from '../../utils/get_oas_document_version';
import { enrichWithVersionMimeParam } from './enrich_with_version_mime_param';

export interface MergeDocumentsOptions {
  splitDocumentsByVersion: boolean;
}

export async function mergeDocuments(
  resolvedDocuments: ResolvedDocument[],
  blankOasDocumentFactory: (oasVersion: string, apiVersion: string) => OpenAPIV3.Document,
  options: MergeDocumentsOptions
): Promise<Map<string, OpenAPIV3.Document>> {
  const documentsByVersion = options.splitDocumentsByVersion
    ? splitByVersion(resolvedDocuments)
    : new Map([['', resolvedDocuments]]);
  const mergedByVersion = new Map<string, OpenAPIV3.Document>();

  if (!options.splitDocumentsByVersion) {
    enrichWithVersionMimeParam(resolvedDocuments);
  }

  for (const [apiVersion, documentsGroup] of documentsByVersion.entries()) {
    validateSameOasVersion(documentsGroup);

    const oasVersion = getOasVersion(documentsGroup[0]);
    const mergedDocument = blankOasDocumentFactory(oasVersion, apiVersion);
    // Any shared components defined in the blank OAS like `securitySchemes` should
    // preserve in the result document. Passing this document in the merge pipeline
    // is the simplest way to take initial components into account.
    const documentsToMerge = [
      {
        absolutePath: 'MERGED RESULT',
        document: mergedDocument as unknown as ResolvedDocument['document'],
      },
      ...documentsGroup,
    ];

    mergedDocument.servers = mergeServers(documentsToMerge);
    mergedDocument.paths = mergePaths(documentsToMerge);
    mergedDocument.components = mergeSharedComponents(documentsToMerge);
    mergedDocument.security = mergeSecurityRequirements(documentsToMerge);
    mergedDocument.tags = mergeTags(documentsToMerge);

    mergedByVersion.set(mergedDocument.info.version, mergedDocument);
  }

  return mergedByVersion;
}

function splitByVersion(resolvedDocuments: ResolvedDocument[]): Map<string, ResolvedDocument[]> {
  const splitBundledDocuments = new Map<string, ResolvedDocument[]>();

  for (const resolvedDocument of resolvedDocuments) {
    const version = getOasDocumentVersion(resolvedDocument);
    const versionBundledDocuments = splitBundledDocuments.get(version);

    if (!versionBundledDocuments) {
      splitBundledDocuments.set(version, [resolvedDocument]);
    } else {
      versionBundledDocuments.push(resolvedDocument);
    }
  }

  return splitBundledDocuments;
}

function validateSameOasVersion(resolvedDocuments: ResolvedDocument[]): void {
  const firstDocumentOasVersion = getOasVersion(resolvedDocuments[0]);

  for (let i = 1; i < resolvedDocuments.length; ++i) {
    if (getOasVersion(resolvedDocuments[i]) !== firstDocumentOasVersion) {
      throw new Error(
        `OpenAPI specs must use the same OpenAPI version, encountered ${chalk.blue(
          resolvedDocuments[i].document.openapi
        )} at ${chalk.bold(resolvedDocuments[i].absolutePath)} does not match ${chalk.blue(
          resolvedDocuments[0].document.openapi
        )} at ${chalk.bold(resolvedDocuments[0].absolutePath)}`
      );
    }
  }
}
