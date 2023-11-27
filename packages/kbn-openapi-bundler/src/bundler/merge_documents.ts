/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import { basename, dirname, join } from 'path';
import chalk from 'chalk';
import { isPlainObjectType } from '../utils/is_plain_object_type';
import { PlainObjectNode, ResolvedDocument } from './types';

type MergedDocuments = Record<string, ResolvedDocument>;

type MergedResult = Record<string, PlainObjectNode>;

interface Components {
  schemas?: Record<string, PlainObjectNode>;
}

interface ComponentsWithSchemas extends PlainObjectNode {
  schemas: Record<string, PlainObjectNode>;
}

export function mergeDocuments(resolvedDocuments: ResolvedDocument[]): MergedResult {
  const mergedDocuments: MergedDocuments = {};
  const sharedComponents: ComponentsWithSchemas = { schemas: {} };

  for (const resolvedDocument of resolvedDocuments) {
    const sourceComponents = resolvedDocument.document.components;

    if (isPlainObjectType(sourceComponents)) {
      mergeComponents(sourceComponents, sharedComponents);
    }

    delete resolvedDocument.document.components;

    mergeDocument(resolvedDocument, mergedDocuments);
  }

  const result: MergedResult = {};

  for (const fileName of Object.keys(mergedDocuments)) {
    result[fileName] = mergedDocuments[fileName].document;
  }

  result['shared_components.schema.yaml'] = sharedComponents;

  return result;
}

function mergeDocument(resolvedDocument: ResolvedDocument, mergeResult: MergedDocuments): void {
  const fileName = basename(resolvedDocument.absolutePath);

  if (!mergeResult[fileName]) {
    mergeResult[fileName] = resolvedDocument;
    return;
  }

  const nonConflicFileName = generateNonConflictingFilePath(
    resolvedDocument.absolutePath,
    mergeResult
  );

  mergeResult[nonConflicFileName] = resolvedDocument;
}

function generateNonConflictingFilePath(
  documentAbsolutePath: string,
  mergeResult: MergedDocuments
): string {
  let pathToDocument = dirname(documentAbsolutePath);
  let suggestedName = basename(documentAbsolutePath);

  while (mergeResult[suggestedName]) {
    suggestedName = `${basename(pathToDocument)}_${suggestedName}`;
    pathToDocument = join(pathToDocument, '..');
  }

  return suggestedName;
}

function mergeComponents(
  sourceComponents: Components,
  resultComponents: ComponentsWithSchemas
): void {
  if (!sourceComponents.schemas) {
    return;
  }

  for (const schema of Object.keys(sourceComponents.schemas)) {
    if (!resultComponents.schemas[schema]) {
      resultComponents.schemas[schema] = sourceComponents.schemas[schema];
      continue;
    }

    if (!deepEqual(resultComponents.schemas[schema], sourceComponents.schemas[schema])) {
      throw new Error(
        `❌ Unable to bundle documents due to conflicts in components schemas. Schema ${chalk.blue(
          schema
        )} is has different definitions`
      );
    }
  }
}
