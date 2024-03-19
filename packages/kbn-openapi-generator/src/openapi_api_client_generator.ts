/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync, writeFileSync } from 'fs';
import globby from 'globby';
import { resolve } from 'path';
import handlebars from 'handlebars';
import { TemplateName } from './template_service/template_service';
import { registerTemplates } from './template_service/register_templates';
import { NormalizedOperation } from './parser/openapi_types';

export interface GeneratorConfig {
  rootDir: string;
  sourceGlob: string;
  templateName: TemplateName;
  contexts: NormalizedOperation[];
}

export const generateApiClient = async (config: GeneratorConfig) => {
  const { rootDir, sourceGlob, templateName, contexts } = config;

  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const apiMethodPaths = await globby([sourceFilesGlob]);

  const files = apiMethodPaths.map((file) => {
    const content = readFileSync(file, 'utf8');
    if (!content) {
      return;
    }

    const exportedMethods = content.match(/export const (\w+) =/g);
    if (!exportedMethods) {
      return;
    }

    const methods = exportedMethods.map((s: string) => {
      const match = s.match(/export const (\w+) =/);
      if (match) {
        return match[1];
      }
    });

    const methodContext = contexts.find((c) => c.path === file);

    const paramsTypes = content.match(/export type (\w+)Params =/g);
    console.log({paramsTypes});

    const relativePath = file.replace(rootDir, '').replace(/\.ts$/, '');;

    return {
      file: `../../..${relativePath}`,
      methods: methods.join(''),
    };
  });
  const templates = await registerTemplates(
    resolve(__dirname, './template_service/templates'),
    handlebars
  );
  const result = handlebars.compile(templates[templateName])({ files });

  writeFileSync('./public/common/api_client/client.ts', result);
  console.log(result);
};

