/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import type { OpenApiDocument, ParsedSource } from './parser/openapi_types';
import type { TemplateName } from './template_service/template_service';
import { initTemplateService } from './template_service/template_service';

export interface GeneratorConfig {
  title?: string;
  rootDir: string;
  sourceGlob: string;
  templateName: TemplateName;
  skipLinting?: boolean;
  bundle?: {
    /**
     * If provided, the OpenAPI specifications will be bundled and written to this file
     */
    outFile: string;
  };
  /**
   * Schema name transformation strategy for generated TypeScript/zod types
   * - 'pascalCase': Converts names to PascalCase
   * - undefined: No transformation (preserves original names)
   * @default undefined
   */
  schemaNameTransform?: 'pascalCase';
  /**
   * This forces the generator to use the Zod v4 import.
   */
  experimentallyImportZodV4?: boolean;
}

export const generate = async (config: GeneratorConfig) => {
  const { title = 'API schemas', rootDir, sourceGlob, templateName, skipLinting, bundle } = config;

  if (!skipLinting) {
    await lint({
      rootDir,
      sourceGlob,
    });
  }

  console.log(chalk.bold(`Generating ${config.title} `));
  console.log(chalk.bold(`Working directory: ${chalk.underline(rootDir)}`));

  console.log(`👀  Searching for source files`);
  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const schemaPaths = await globby([sourceFilesGlob]);

  console.log(`🕵️‍♀️   Found ${schemaPaths.length} schemas, parsing`);
  let parsedSources: ParsedSource[] = await Promise.all(
    schemaPaths.map(async (sourcePath) => {
      const parsedSchema = (await SwaggerParser.parse(sourcePath)) as OpenApiDocument;
      return {
        sourcePath,
        generatedPath: getGeneratedFilePath(sourcePath),
        generationContext: getGenerationContext(parsedSchema, {
          schemaNameTransform: config.schemaNameTransform,
          experimentallyImportZodV4: config.experimentallyImportZodV4,
        }),
      };
    })
  );
  // If there are no operations or components to generate, skip this file
  parsedSources = parsedSources.filter(
    ({ generationContext }) =>
      generationContext.operations.length > 0 || generationContext.components !== undefined
  );
  parsedSources.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  parsedSources.forEach((source) =>
    source.generationContext.operations.sort((a, b) => a.operationId.localeCompare(b.operationId))
  );

  console.log(`🧹  Cleaning up any previously generated artifacts`);
  if (bundle) {
    await fs.rm(bundle.outFile, { force: true });
  } else {
    await removeGenArtifacts(rootDir);
  }

  console.log(`🪄   Generating new artifacts`);
  const TemplateService = await initTemplateService();
  if (bundle) {
    console.log(`📦  Bundling ${title}`);
    const operations = parsedSources
      .flatMap(({ generationContext, sourcePath }) =>
        // Add the sourcePath to each operation so we can generate the correct import paths for bundled operations
        generationContext.operations.map((op) => ({
          ...op,
          sourcePath,
          version: generationContext.info.version,
        }))
      )
      // Sort the operations by operationId so the output is deterministic
      .sort((a, b) => a.operationId.localeCompare(b.operationId));

    const result = TemplateService.compileBundleTemplate(templateName, {
      operations,
      sources: parsedSources,
      info: {
        title,
        version: 'Bundle (no version)',
      },
      config: {
        schemaNameTransform: config.schemaNameTransform,
        experimentallyImportZodV4: config.experimentallyImportZodV4,
      },
    });

    await fs.writeFile(bundle.outFile, result);
    console.log(`📖  Wrote bundled artifact to ${chalk.bold(bundle.outFile)}`);
  } else {
    await Promise.all(
      parsedSources.map(async ({ generatedPath, generationContext }) => {
        const result = TemplateService.compileTemplate(templateName, generationContext);

        // Write the generation result to disk
        await fs.writeFile(generatedPath, result);
      })
    );
  }

  // Format the output folder using prettier as the generator produces
  // unformatted code and fix any eslint errors
  console.log(`💅  Formatting output`);
  if (bundle) {
    await formatOutput(bundle.outFile);
    await fixEslint(bundle.outFile);
  } else {
    const generatedArtifactsGlob = resolve(rootDir, './**/*.gen.ts');
    await formatOutput(generatedArtifactsGlob);
    await fixEslint(generatedArtifactsGlob);
  }
};
