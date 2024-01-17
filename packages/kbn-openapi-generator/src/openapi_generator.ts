/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-console */

import SwaggerParser from '@apidevtools/swagger-parser';
import chalk from 'chalk';
import fs from 'fs/promises';
import globby from 'globby';
import { resolve } from 'path';
import { fixEslint } from './lib/fix_eslint';
import { formatOutput } from './lib/format_output';
import { getGeneratedFilePath } from './lib/get_generated_file_path';
import { removeGenArtifacts } from './lib/remove_gen_artifacts';
import { lint } from './openapi_linter';
import { getGenerationContext } from './parser/get_generation_context';
import type { OpenApiDocument } from './parser/openapi_types';
import { initTemplateService, TemplateName } from './template_service/template_service';

export interface GeneratorConfig {
  rootDir: string;
  sourceGlob: string;
  templateName: TemplateName;
  skipLinting?: boolean;
}

export const generate = async (config: GeneratorConfig) => {
  const { rootDir, sourceGlob, templateName, skipLinting } = config;

  if (!skipLinting) {
    await lint({
      rootDir,
      sourceGlob,
    });
  }

  console.log(chalk.bold(`Generating API route schemas`));
  console.log(chalk.bold(`Working directory: ${chalk.underline(rootDir)}`));

  console.log(`👀  Searching for source files`);
  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const schemaPaths = await globby([sourceFilesGlob]);

  console.log(`🕵️‍♀️   Found ${schemaPaths.length} schemas, parsing`);
  const parsedSources = await Promise.all(
    schemaPaths.map(async (sourcePath) => {
      const parsedSchema = (await SwaggerParser.parse(sourcePath)) as OpenApiDocument;
      return { sourcePath, parsedSchema };
    })
  );

  console.log(`🧹  Cleaning up any previously generated artifacts`);
  await removeGenArtifacts(rootDir);

  console.log(`🪄   Generating new artifacts`);
  const TemplateService = await initTemplateService();
  await Promise.all(
    parsedSources.map(async ({ sourcePath, parsedSchema }) => {
      const generationContext = getGenerationContext(parsedSchema);

      // If there are no operations or components to generate, skip this file
      const shouldGenerate =
        generationContext.operations.length > 0 || generationContext.components !== undefined;
      if (!shouldGenerate) {
        return;
      }

      const result = TemplateService.compileTemplate(templateName, generationContext);

      // Write the generation result to disk
      await fs.writeFile(getGeneratedFilePath(sourcePath), result);
    })
  );

  // Format the output folder using prettier as the generator produces
  // unformatted code and fix any eslint errors
  console.log(`💅  Formatting output`);
  const generatedArtifactsGlob = resolve(rootDir, './**/*.gen.ts');
  await formatOutput(generatedArtifactsGlob);
  await fixEslint(generatedArtifactsGlob);
};
