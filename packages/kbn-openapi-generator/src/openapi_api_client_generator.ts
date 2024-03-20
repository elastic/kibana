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
import { TemplateName, initTemplateService } from './template_service/template_service';
import { NormalizedOperation } from './parser/openapi_types';
import { getApiClientGenerationContext } from './parser/get_generation_context';

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
  const apiMethodFilePaths = await globby([sourceFilesGlob]);

  const apiClientGenerationContext = getApiClientGenerationContext(
    apiMethodFilePaths,
    operations,
    rootDir
  );

  const result = TemplateService.compileTemplate(templateName, apiClientGenerationContext);

  writeFileSync('./public/common/api_client/client.ts', result);
};
