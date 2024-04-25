/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { ConflictError } from '../../utils/conflict_error';
import { BundledDocument } from '../bundle_document';

export function mergePaths(bundledDocuments: BundledDocument[]): OpenAPIV3.PathsObject {
  const mergedPaths: OpenAPIV3.PathsObject = {};

  for (const { absolutePath, document } of bundledDocuments) {
    if (!document.paths) {
      continue;
    }

    const oasDocument = document as unknown as OpenAPIV3.Document;

    for (const path of Object.keys(oasDocument.paths)) {
      if (!mergedPaths[path]) {
        mergedPaths[path] = {};
      }

      try {
        mergeOptionalStringField(oasDocument.paths[path]!, mergedPaths[path]!, 'summary');
        mergeOptionalStringField(oasDocument.paths[path]!, mergedPaths[path]!, 'description');
        mergeOperations(oasDocument.paths[path]!, mergedPaths[path]!);
      } catch (e) {
        if (e instanceof ConflictError) {
          throw new Error(`❌ ${e.message} paths[${path}][${e.documentLocation}] ${absolutePath}`);
        }
      }
    }
  }

  return mergedPaths;
}

const KNOWN_HTTP_METHODS = [
  OpenAPIV3.HttpMethods.HEAD,
  OpenAPIV3.HttpMethods.GET,
  OpenAPIV3.HttpMethods.POST,
  OpenAPIV3.HttpMethods.PATCH,
  OpenAPIV3.HttpMethods.PUT,
  OpenAPIV3.HttpMethods.OPTIONS,
  OpenAPIV3.HttpMethods.DELETE,
  OpenAPIV3.HttpMethods.TRACE,
];

function mergeOperations(
  pathItem: OpenAPIV3.PathItemObject,
  mergedPathItems: OpenAPIV3.PathItemObject
) {
  for (const httpMethod of KNOWN_HTTP_METHODS) {
    if (!pathItem[httpMethod]) {
      continue;
    }

    if (mergedPathItems[httpMethod]) {
      throw new ConflictError(
        `The same operation ${chalk.red(httpMethod)} is defined in more than one document`,
        httpMethod
      );
    }

    mergedPathItems[httpMethod] = pathItem[httpMethod];
  }
}

function mergeOptionalStringField<FieldName extends string>(
  source: { [field in FieldName]?: unknown },
  merged: { [field in FieldName]?: unknown },
  fieldName: FieldName
): void {
  if (!source[fieldName]) {
    return;
  }

  if (source[fieldName] && !merged[fieldName]) {
    merged[fieldName] = source[fieldName];
    return;
  }

  if (merged[fieldName] !== source[fieldName]) {
    throw new ConflictError(
      `Encountered conflicting ${chalk.red(fieldName)} values. ${chalk.red(
        fieldName
      )} is optional and should be omitted or have the same value in all schemas`,
      fieldName
    );
  }
}
