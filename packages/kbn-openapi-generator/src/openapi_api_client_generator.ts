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
// import Handlebars from 'handlebars';
import { snakeCase, camelCase } from 'lodash';
import { TemplateName, initTemplateService } from './template_service/template_service';
import { registerTemplates } from './template_service/register_templates';
import { NormalizedOperation } from './parser/openapi_types';

export interface GeneratorConfig {
  rootDir: string;
  sourceGlob: string;
  templateName: TemplateName;
  operations: NormalizedOperation[];
}

export const generateApiClient = async (config: GeneratorConfig) => {
  const { rootDir, sourceGlob, templateName, operations } = config;

  const TemplateService = await initTemplateService();

  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const apiMethodPaths = await globby([sourceFilesGlob]);

  const context = apiMethodPaths.map((filePath) => {
    const operationIdFromPath = getOperationIdFromPath(filePath);

    const operation =
      operations.find((o) => snakeCase(o.operationId) === operationIdFromPath) ??
      ({} as NormalizedOperation);

    const { operationId, description, requestQuery, requestBody } = operation;
    const apiMethodRelativePath = `../../..${filePath.replace(rootDir, '').replace(/\.ts$/, '')}`;
    const generatedTypesRelativePath = `../../..${filePath
      .replace(rootDir, '')
      .replace(/\.api_method/, '')
      .replace(/\.ts$/, '')}`;

    return {
      generatedTypesRelativePath,
      apiMethodRelativePath,
      operationId: camelCase(operationId),
      description,
      requestQuery,
      requestBody,
    };
  });

  console.log({ apiMethodPaths, context });

  const result = TemplateService.compileTemplate(templateName, {context});

  // const templates = await registerTemplates(
  //   resolve(__dirname, './template_service/templates'),
  //   handlebars
  // );

  // const result = handlebars.compile(templates[templateName])({ context });
  console.log({result});
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
 * Rxample:
 *
 * '/some/path/delete_rule_route.api_client.gen.ts' -> 'delete_rule'
 */
export const getOperationIdFromPath = (path: string) => {
  const match = path.match(/\/([^/]+)_route\.api_method\.gen\.ts$/);
  if (match) {
    return match[1];
  }
};
