/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { BundledDocument } from '../bundle_document';

export function mergePaths(bundledDocuments: BundledDocument[]): OpenAPIV3.PathsObject {
  const mergedPaths: Record<string, OpenAPIV3.PathItemObject> = {};

  for (const { absolutePath, document } of bundledDocuments) {
    if (!document.paths) {
      continue;
    }

    const pathsObject = document.paths as Record<string, OpenAPIV3.PathItemObject>;

    for (const path of Object.keys(pathsObject)) {
      if (!mergedPaths[path]) {
        mergedPaths[path] = {};
      }

      const sourcePathItem = pathsObject[path];
      const mergedPathItem = mergedPaths[path];

      try {
        mergedPathItem.summary = mergeOptionalPrimitiveValue(
          sourcePathItem.summary,
          mergedPathItem.summary
        );
      } catch {
        throw new Error(
          `❌  Unable to bundle ${chalk.bold(absolutePath)} since ${chalk.bold(
            `paths.${path}.summary`
          )}'s value ${chalk.blue(
            sourcePathItem.summary
          )} doesn't match to already encountered ${chalk.magenta(mergedPathItem.summary)}.`
        );
      }

      try {
        mergedPathItem.description = mergeOptionalPrimitiveValue(
          sourcePathItem.description,
          mergedPathItem.description
        );
      } catch {
        throw new Error(
          `❌  Unable to bundle ${chalk.bold(absolutePath)} since ${chalk.bold(
            `paths.${path}.description`
          )}'s value ${chalk.blue(
            sourcePathItem.description
          )} doesn't match to already encountered ${chalk.magenta(mergedPathItem.description)}.`
        );
      }

      try {
        mergeOperations(sourcePathItem, mergedPathItem);
      } catch (e) {
        throw new Error(
          `❌  Unable to bundle ${chalk.bold(absolutePath)} since ${chalk.bold(
            `paths.${path}.${e.message}`
          )}'s definition is duplicated and differs from previously encountered.`
        );
      }

      try {
        mergeParameters(sourcePathItem, mergedPathItem);
      } catch (e) {
        throw new Error(
          `❌  Unable to bundle ${chalk.bold(absolutePath)} since ${chalk.bold(
            `paths.${path}.parameters.[${e.message}]`
          )}'s definition is duplicated and differs from previously encountered.`
        );
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
  sourcePathItem: OpenAPIV3.PathItemObject,
  mergedPathItem: OpenAPIV3.PathItemObject
) {
  for (const httpMethod of KNOWN_HTTP_METHODS) {
    if (!sourcePathItem[httpMethod]) {
      continue;
    }

    if (mergedPathItem[httpMethod]) {
      throw new Error(httpMethod);
    }

    mergedPathItem[httpMethod] = sourcePathItem[httpMethod];
  }
}

function mergeOptionalPrimitiveValue<Value extends string | number | boolean | undefined>(
  incoming: Value,
  existing: Value
): Value {
  if (!incoming) {
    return existing;
  }

  if (incoming && !existing) {
    return incoming;
  }

  if (incoming !== existing) {
    throw new Error('Primitive value merge conflict');
  }

  return existing;
}

function mergeParameters(
  sourcePathItem: OpenAPIV3.PathItemObject,
  mergedPathItem: OpenAPIV3.PathItemObject
): void {
  if (!sourcePathItem.parameters) {
    return;
  }

  if (!mergedPathItem.parameters) {
    mergedPathItem.parameters = [];
  }

  for (const sourceParameter of sourcePathItem.parameters) {
    if ('$ref' in sourceParameter) {
      const existing = mergedPathItem.parameters.find(
        (x) => '$ref' in x && x.$ref === sourceParameter.$ref
      );

      if (existing) {
        continue;
      }
    } else {
      const existing = mergedPathItem.parameters.find(
        (x) => !('$ref' in x) && x.name === sourceParameter.name && x.in === sourceParameter.in
      );

      if (existing) {
        throw new Error(`{ "name": "${sourceParameter.name}", "in": "${sourceParameter.in}" }`);
      }
    }

    mergedPathItem.parameters.push(sourceParameter);
  }
}
