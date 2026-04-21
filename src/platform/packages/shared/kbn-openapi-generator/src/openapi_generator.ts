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
import { dirname, join, relative, resolve } from 'path';
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
   * When set, emit a mirrored tree of type-only files (no Zod runtime cost) under
   * this directory path (relative to `rootDir`), plus a generated `index.ts` barrel.
   * Mutually exclusive with `bundle`.
   */
  emitTypesOnlyDir?: string;
}

export const generate = async (config: GeneratorConfig) => {
  const {
    title = 'API schemas',
    rootDir,
    sourceGlob,
    templateName,
    skipLinting,
    bundle,
    emitTypesOnlyDir,
  } = config;

  if (bundle && emitTypesOnlyDir) {
    throw new Error(
      'GeneratorConfig: `bundle` and `emitTypesOnlyDir` are mutually exclusive. ' +
        'Types-only emission is only supported in per-file (non-bundle) mode.'
    );
  }

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
    const typesOnlyIndexPath = emitTypesOnlyDir
      ? resolve(rootDir, emitTypesOnlyDir, 'index.ts')
      : undefined;
    await removeGenArtifacts(rootDir, typesOnlyIndexPath);
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
      },
    });

    await fs.writeFile(bundle.outFile, result);
    console.log(`📖  Wrote bundled artifact to ${chalk.bold(bundle.outFile)}`);
  } else {
    // Derive the directory that is the common root of all source files (the part
    // of sourceGlob before the first wildcard).
    const starIdx = sourceGlob.indexOf('*');
    const sourceGlobBase = starIdx >= 0 ? sourceGlob.substring(0, starIdx) : sourceGlob;
    const sourcesRootAbs = resolve(rootDir, sourceGlobBase.replace(/\/+$/, ''));
    const typesOnlyAbsDir = emitTypesOnlyDir ? resolve(rootDir, emitTypesOnlyDir) : null;

    await Promise.all(
      parsedSources.map(async ({ generatedPath, generationContext }) => {
        const result = TemplateService.compileTemplate(templateName, generationContext);

        // Write the generation result to disk
        await fs.writeFile(generatedPath, result);

        if (typesOnlyAbsDir) {
          const relPath = relative(sourcesRootAbs, generatedPath);
          const typesOnlyPath = join(typesOnlyAbsDir, relPath);
          await fs.mkdir(dirname(typesOnlyPath), { recursive: true });
          const typesResult = TemplateService.compileTemplate('ts_types_only', generationContext);
          await fs.writeFile(typesOnlyPath, typesResult);
        }
      })
    );

    if (typesOnlyAbsDir) {
      // Detect barrel conflicts: skip files whose component-schema names appear
      // in more than one source file. (Identical schema names across files cause
      // TypeScript re-export ambiguity errors when using `export *`.)
      const fileExportNames = parsedSources.map(({ generatedPath, generationContext }) => {
        const names = new Set<string>(Object.keys(generationContext.components?.schemas ?? {}));
        generationContext.operations.forEach((op) => {
          if (op.requestQuery) names.add(`${op.operationId}RequestQuery`);
          if (op.requestParams) names.add(`${op.operationId}RequestParams`);
          if (op.requestBody) names.add(`${op.operationId}RequestBody`);
          if (op.response) names.add(`${op.operationId}Response`);
        });
        return { generatedPath, names };
      });
      const nameCounts = new Map<string, number>();
      fileExportNames.forEach(({ names }) => {
        names.forEach((n) => nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1));
      });
      const conflictingPaths = new Set(
        fileExportNames
          .filter(({ names }) => [...names].some((n) => (nameCounts.get(n) ?? 0) > 1))
          .map(({ generatedPath }) => generatedPath)
      );

      const barrelLines = parsedSources
        .filter(({ generatedPath }) => !conflictingPaths.has(generatedPath))
        .map(({ generatedPath }) => {
          const relPath = relative(sourcesRootAbs, generatedPath);
          // Use forward slashes and strip the .ts extension for the import path
          const importPath = './' + relPath.replace(/\\/g, '/').replace(/\.ts$/, '');
          return `export * from '${importPath}';`;
        })
        .sort();

      const barrelContent = [
        '/*',
        ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
        ' * or more contributor license agreements. Licensed under the Elastic License',
        ' * 2.0; you may not use this file except in compliance with the Elastic License',
        ' * 2.0.',
        ' */',
        '',
        '/*',
        ' * NOTICE: Do not edit this file manually.',
        ' * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.',
        ' */',
        '',
        ...barrelLines,
        '',
      ].join('\n');

      await fs.writeFile(join(typesOnlyAbsDir, 'index.ts'), barrelContent);
    }
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
    if (emitTypesOnlyDir) {
      const typesIndexPath = resolve(rootDir, emitTypesOnlyDir, 'index.ts');
      await formatOutput(typesIndexPath);
      await fixEslint(typesIndexPath);
    }
  }
};
