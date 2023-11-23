/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { OpenAPIV3 } from 'openapi-types';
import { logger } from '../lib/logger';
import { X_SOURCE_FILE_PATH } from './document_processors/lib/known_custom_props';
import { Document } from './types';

type HttpMethods = typeof HTTP_METHODS[number];
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export function mergeDocuments(documents: Document[]): Document {
  const resultDocument: Document = {
    openapi: '3.0.3',
    info: {
      title: 'Bundled specs file. See individual path.verb.tags for details',
      version: 'not applicable',
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  for (const document of documents) {
    const openApiVersion = document.openapi;

    if (!openApiVersion.startsWith('3.0.')) {
      logger.warning('❗ Processing specs must have 3.0 OpenAPI version');
    }

    const title = document.info.title;
    const version = document.info.version;

    mergePaths(document.paths, resultDocument.paths, {
      title,
      version,
    });
    mergeComponents(document.components, resultDocument.components!);
  }

  for (const schema of Object.keys(resultDocument.components?.schemas ?? {})) {
    deleteSourceFilePathProp(resultDocument.components!.schemas![schema] as OpenAPIV3.SchemaObject);
  }

  return resultDocument;
}

function mergePaths(
  sourcePaths: OpenAPIV3.PathsObject,
  resultPaths: OpenAPIV3.PathsObject,
  extraTags: Record<string, unknown>
): void {
  for (const path of Object.keys(sourcePaths)) {
    if (!sourcePaths[path]) {
      continue;
    }

    if (!resultPaths[path]) {
      resultPaths[path] = {};
    }

    try {
      mergeVerbs(sourcePaths[path]!, resultPaths[path]!, extraTags);
    } catch (e) {
      throw new Error(`Unable to bundle path "${path}": ${e.message}`);
    }
  }
}

function mergeVerbs(
  sourceVerbs: NonNullable<OpenAPIV3.PathItemObject>,
  resultVerbs: NonNullable<OpenAPIV3.PathItemObject>,
  extraTags: Record<string, unknown>
): void {
  for (const maybeVerb of Object.keys(sourceVerbs)) {
    if (!(HTTP_METHODS as readonly string[]).includes(maybeVerb)) {
      continue;
    }

    const verb = maybeVerb as HttpMethods;

    if (resultVerbs[verb]) {
      throw new Error(`Unable to bundle verb "${verb}" due to duplication`);
    }

    if (!sourceVerbs[verb]) {
      continue;
    }

    resultVerbs[verb] = sourceVerbs[verb];

    addTags(extraTags, resultVerbs[verb]!);
  }
}

function addTags(tags: Record<string, unknown>, container: { tags?: unknown[] }): void {
  if (!container.tags) {
    container.tags = [];
  }

  for (const tagKey of Object.keys(tags)) {
    container.tags.push(`[${tagKey}] ${tags[tagKey]}`);
  }
}

function mergeComponents(
  sourceComponents: OpenAPIV3.ComponentsObject | undefined,
  resultComponents: OpenAPIV3.ComponentsObject
): void {
  if (!sourceComponents?.schemas) {
    return;
  }

  if (!resultComponents.schemas) {
    resultComponents.schemas = {};
  }

  for (const schema of Object.keys(sourceComponents.schemas)) {
    if (!resultComponents.schemas[schema]) {
      resultComponents.schemas[schema] = sourceComponents.schemas[schema];
      continue;
    }

    const sourceSchemaFilePath = getSourceFilePath(
      sourceComponents.schemas[schema] as OpenAPIV3.SchemaObject
    );
    const resultSchemaFilePath = getSourceFilePath(
      resultComponents.schemas[schema] as OpenAPIV3.SchemaObject
    );

    if (sourceSchemaFilePath !== resultSchemaFilePath) {
      throw new Error(
        `❌ Unable to bundle documents due to conflicts in components schemas. Schema ${chalk.blue(
          schema
        )} encountered in ${chalk.magenta(sourceSchemaFilePath)} and ${chalk.cyan(
          resultSchemaFilePath
        )}.`
      );
    }

    resultComponents.schemas[schema] = sourceComponents.schemas[schema];
  }
}

function getSourceFilePath(schema: OpenAPIV3.SchemaObject): string {
  if (!(X_SOURCE_FILE_PATH in schema)) {
    logger.warning(
      `Unable to find ${chalk.blue(
        X_SOURCE_FILE_PATH
      )} in components schema. Conflicts will be overridden.`
    );
    return 'unknown';
  }

  return schema[X_SOURCE_FILE_PATH];
}

function deleteSourceFilePathProp(node: OpenAPIV3.SchemaObject): void {
  if (X_SOURCE_FILE_PATH in node) {
    delete node[X_SOURCE_FILE_PATH];
  }
}
