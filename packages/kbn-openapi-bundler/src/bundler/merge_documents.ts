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
import { parseRef } from '../utils/parse_ref';
import { insertRefByPointer } from '../utils/insert_by_json_pointer';
import { DocumentNodeProcessor, PlainObjectNode, ResolvedDocument, ResolvedRef } from './types';
import { BundledDocument } from './bundle_document';
import { processDocument } from './process_document';

type MergedDocuments = Record<string, ResolvedDocument>;

type MergedResult = Record<string, PlainObjectNode>;

const SHARED_COMPONENTS_FILE_NAME = 'shared_components.schema.yaml';

export async function mergeDocuments(bundledDocuments: BundledDocument[]): Promise<MergedResult> {
  const mergedDocuments: MergedDocuments = {};
  const componentsMap = new Map<string, ResolvedRef>();

  for (const bundledDocument of bundledDocuments) {
    mergeRefsToMap(bundledDocument.bundledRefs, componentsMap);

    delete bundledDocument.document.components;

    await setRefsFileName(bundledDocument, SHARED_COMPONENTS_FILE_NAME);
    mergeDocument(bundledDocument, mergedDocuments);
  }

  const result: MergedResult = {};

  for (const fileName of Object.keys(mergedDocuments)) {
    result[fileName] = mergedDocuments[fileName].document;
  }

  result[SHARED_COMPONENTS_FILE_NAME] = {
    components: componentsMapToComponents(componentsMap),
  };

  return result;
}

function mergeDocument(resolvedDocument: ResolvedDocument, mergeResult: MergedDocuments): void {
  const fileName = basename(resolvedDocument.absolutePath);

  if (!mergeResult[fileName]) {
    mergeResult[fileName] = resolvedDocument;
    return;
  }

  const nonConflictFileName = generateNonConflictingFilePath(
    resolvedDocument.absolutePath,
    mergeResult
  );

  mergeResult[nonConflictFileName] = resolvedDocument;
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

function mergeRefsToMap(bundledRefs: ResolvedRef[], componentsMap: Map<string, ResolvedRef>): void {
  for (const bundledRef of bundledRefs) {
    const existingRef = componentsMap.get(bundledRef.pointer);

    if (!existingRef) {
      componentsMap.set(bundledRef.pointer, bundledRef);
      continue;
    }

    if (deepEqual(existingRef.refNode, bundledRef.refNode)) {
      continue;
    }

    throw new Error(
      `❌ Unable to bundle documents due to conflicts in references. Schema ${chalk.yellow(
        bundledRef.pointer
      )} is defined in ${chalk.blue(existingRef.absolutePath)} and in ${chalk.magenta(
        bundledRef.absolutePath
      )} but has not matching definitions.`
    );
  }
}

function componentsMapToComponents(
  componentsMap: Map<string, ResolvedRef>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const resolvedRef of componentsMap.values()) {
    insertRefByPointer(resolvedRef.pointer, resolvedRef.refNode, result);
  }

  return result;
}

async function setRefsFileName(
  resolvedDocument: ResolvedDocument,
  fileName: string
): Promise<void> {
  // We don't need to follow references
  const stubRefResolver = {
    resolveRef: async (refDocumentAbsolutePath: string, pointer: string): Promise<ResolvedRef> => ({
      absolutePath: refDocumentAbsolutePath,
      pointer,
      document: resolvedDocument.document,
      refNode: {},
    }),
    resolveDocument: async (): Promise<ResolvedDocument> => ({
      absolutePath: '',
      document: resolvedDocument.document,
    }),
  };
  const setRefFileProcessor: DocumentNodeProcessor = {
    ref: (node) => {
      const { pointer } = parseRef(node.$ref);

      node.$ref = `./${fileName}#${pointer}`;
    },
  };

  await processDocument(resolvedDocument, stubRefResolver, [setRefFileProcessor]);
}
