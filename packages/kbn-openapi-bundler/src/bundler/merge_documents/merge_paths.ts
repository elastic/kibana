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
import { isRefNode } from '../process_document';
import { mergeOperations } from './merge_operations';
import { mergeArrays } from './merge_arrays';

export function mergePaths(resolvedDocuments: ResolvedDocument[]): OpenAPIV3.PathsObject {
  const mergedPaths: Record<string, OpenAPIV3.PathItemObject> = {};

  for (const { absolutePath, document } of resolvedDocuments) {
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

      if (isRefNode(sourcePathItem)) {
        throw new Error('Path item top level $ref is not supported');
      }

      try {
        mergeOptionalPrimitiveValue('summary', sourcePathItem, mergedPathItem);
      } catch {
        throw new Error(
          `❌  Unable to merge ${chalk.bold(absolutePath)} due to ${chalk.bold(
            `paths.${path}.summary`
          )}'s value ${chalk.blue(
            sourcePathItem.summary
          )} doesn't match to already encountered ${chalk.magenta(mergedPathItem.summary)}.`
        );
      }

      try {
        mergeOptionalPrimitiveValue('description', sourcePathItem, mergedPathItem);
      } catch {
        throw new Error(
          `❌  Unable to merge ${chalk.bold(absolutePath)} due to ${chalk.bold(
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
          `❌  Unable to merge ${chalk.bold(absolutePath)} due to an error in ${chalk.bold(
            `paths.${path}`
          )} occurred "${e.message}".`
        );
      }

      mergePathItemServers(sourcePathItem, mergedPathItem);

      try {
        mergeParameters(sourcePathItem, mergedPathItem);
      } catch (e) {
        throw new Error(
          `❌  Unable to merge ${chalk.bold(absolutePath)} since ${chalk.bold(
            `paths.${path}.servers.[${e.message}]`
          )}'s definition is duplicated and differs from previously encountered.`
        );
      }
    }
  }

  return mergedPaths;
}

function mergeOptionalPrimitiveValue<FieldName extends string>(
  fieldName: FieldName,
  source: { [field in FieldName]?: unknown },
  merged: { [field in FieldName]?: unknown }
): void {
  if (!source[fieldName]) {
    return;
  }

  if (source[fieldName] && !merged[fieldName]) {
    merged[fieldName] = source[fieldName];
  }

  if (source[fieldName] !== merged[fieldName]) {
    throw new Error(`${fieldName} merge conflict`);
  }
}

function mergePathItemServers(
  sourcePathItem: OpenAPIV3.PathItemObject,
  mergedPathItem: OpenAPIV3.PathItemObject
): void {
  if (!sourcePathItem.servers) {
    return;
  }

  if (!mergedPathItem.servers) {
    mergedPathItem.servers = [];
  }

  mergedPathItem.servers = mergeArrays([sourcePathItem.servers, mergedPathItem.servers]);
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
    if (isRefNode(sourceParameter)) {
      const existing = mergedPathItem.parameters.find(
        (x) => isRefNode(x) && x.$ref === sourceParameter.$ref
      );

      if (existing) {
        continue;
      }
    } else {
      const existing = mergedPathItem.parameters.find(
        (x) => !isRefNode(x) && x.name === sourceParameter.name && x.in === sourceParameter.in
      );

      if (existing) {
        throw new Error(`{ "name": "${sourceParameter.name}", "in": "${sourceParameter.in}" }`);
      }
    }

    mergedPathItem.parameters.push(sourceParameter);
  }
}
