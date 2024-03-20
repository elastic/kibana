/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync } from 'fs';
import globby from 'globby';
import { resolve } from 'path';
import { camelCase, upperFirst, lowerFirst } from 'lodash';
import { TemplateName, initTemplateService } from './template_service/template_service';
import { NormalizedOperation } from './parser/openapi_types';

export interface GeneratorConfig {
  rootDir: string;
  sourceGlob: string;
  templateName: TemplateName;
  operations: NormalizedOperation[];
}

export type ApiMethodInterface = Record<
  string,
  {
    paths: {
      schemaTypesRelativePath: string;
      apiMethodRelativePath: string;
    };
    operation: NormalizedOperation | undefined;
  }
>;

export const generateApiClient = async (config: GeneratorConfig) => {
  const { rootDir, sourceGlob, templateName, operations } = config;

  const TemplateService = await initTemplateService();

  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const apiMethodFilePaths = await globby([sourceFilesGlob]);

  const operationIdsFromPath = apiMethodFilePaths.map((filePath) => {
    return [filePath, camelCase(getOperationIdFromPath(filePath))];
  }) as Array<[string, string]>;

  const apiMethodContext = operationIdsFromPath.reduce<ApiMethodInterface>(
    (acc: ApiMethodInterface, operationTuple: [string, string]) => {
      const [filePath, operationId] = operationTuple;
      const operation = operations.find((op) => op.operationId === upperFirst(operationId));
      acc[operationId] = {
        paths: {
          schemaTypesRelativePath: getSchemaTypesRelativePathFromFilePath(filePath, rootDir),
          apiMethodRelativePath: getApiMethodRelativePathFromFilePath(filePath, rootDir),
        },
        operation,
      };
      return acc;
    },
    {}
  );
  console.log({ operationIdsFromPath, apiMethodContext });
  console.log(JSON.stringify(apiMethodContext, null, 2));


  const result = TemplateService.compileTemplate(templateName, apiMethodContext);

  // console.log({ result });
  writeFileSync('./public/common/api_client/client.ts', result);
};

/**
 * Extracts the operationId from a given path string.
 *
 * Looks for a match against the pattern:
 *
 * /([^/]+)_route\.api_client\.gen\.ts$
 *
 * Returns the first match group, which will be the operationId.
 *
 * Example:
 *
 * '/some/path/delete_rule_route.api_client.gen.ts' -> 'delete_rule'
 */
export const getOperationIdFromPath = (path: string) => {
  const match = path.match(/\/([^/]+)_route\.api_method\.gen\.ts$/);
  if (match) {
    return match[1];
  }
  return '';
};

const getApiMethodRelativePathFromFilePath = (filePath: string, rootDir: string) =>
  `../../..${filePath.replace(rootDir, '').replace(/\.ts$/, '')}`;

const getSchemaTypesRelativePathFromFilePath = (filePath: string, rootDir: string) =>
  `../../..${filePath
    .replace(rootDir, '')
    .replace(/\.api_method/, '')
    .replace(/\.ts$/, '')}`;
