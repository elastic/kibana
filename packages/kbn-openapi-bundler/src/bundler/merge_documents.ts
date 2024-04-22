/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import deepEqual from 'fast-deep-equal';
import chalk from 'chalk';
import { insertRefByPointer } from '../utils/insert_by_json_pointer';
import { ResolvedRef } from './types';
import { BundledDocument } from './bundle_document';

export async function mergeDocuments(
  bundledDocuments: BundledDocument[]
): Promise<OpenAPIV3.Document> {
  const mergedDocument = createBlankOpenApiDocument();
  const documents = bundledDocuments.map((x) => x.document) as unknown as OpenAPIV3.Document[];

  mergedDocument.paths = mergePaths(documents);
  mergedDocument.components = mergeSharedComponents(bundledDocuments);

  return mergedDocument;
}

function mergePaths(documents: OpenAPIV3.Document[]): OpenAPIV3.PathsObject {
  const mergedPaths: OpenAPIV3.PathsObject = {};
  const knownHttpMethods = [
    OpenAPIV3.HttpMethods.HEAD,
    OpenAPIV3.HttpMethods.GET,
    OpenAPIV3.HttpMethods.POST,
    OpenAPIV3.HttpMethods.PATCH,
    OpenAPIV3.HttpMethods.PUT,
    OpenAPIV3.HttpMethods.OPTIONS,
    OpenAPIV3.HttpMethods.DELETE,
    OpenAPIV3.HttpMethods.TRACE,
  ];

  for (const document of documents) {
    for (const path of Object.keys(document.paths)) {
      if (!mergedPaths[path]) {
        mergedPaths[path] = {};
      }

      const documentPath = document.paths[path]!;

      for (const httpMethod of knownHttpMethods) {
        if (documentPath[httpMethod]) {
          mergedPaths[path]![httpMethod] = documentPath[httpMethod];
        }
      }
    }
  }

  return mergedPaths;
}

function mergeSharedComponents(bundledDocuments: BundledDocument[]): OpenAPIV3.ComponentsObject {
  const componentsMap = new Map<string, ResolvedRef>();

  for (const bundledDocument of bundledDocuments) {
    mergeRefsToMap(bundledDocument.bundledRefs, componentsMap);
  }

  return componentsMapToComponents(componentsMap);
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

function createBlankOpenApiDocument(): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Bundled OpenAPI specs',
      version: '2023-10-31',
    },
    paths: {},
  };
}
