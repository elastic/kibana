/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';

import { REPO_ROOT } from '@kbn/utils';
import { RunWithCommands } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

import { buildSchema } from './build_schema';
import { loadYaml } from './load_yaml';
import { printSchema } from './printer';

const PACKAGE_DIR = path.resolve(REPO_ROOT, 'packages/kbn-ecs-schema/');

/* eslint-disable no-console */
function execute(spec: string, outDir: string) {
  const specPath = path.resolve(PACKAGE_DIR, '.', spec);
  console.log(`Loading ecs_nested.yml from ${specPath}`);

  const specYaml = loadYaml(specPath);
  if (!spec) {
    console.error(`Failed to load spec from ${spec}`);
    process.exit(1);
  }

  const outPath = path.resolve(PACKAGE_DIR, '.', outDir);
  emptyGeneratedFolder(outPath);

  const schema = buildSchema(specYaml);
  printSchema(schema, outPath);
}

function emptyGeneratedFolder(outPath: string) {
  const files = fs.readdirSync(outPath);
  for (const file of files) {
    fs.unlinkSync(path.join(outPath, file));
  }
}

export function runCli() {
  new RunWithCommands({
    description:
      'Generate TypeScript schema definitions for a given version' +
      'of the Elastic Common Schema (ECS).',
  })
    .command({
      name: 'generate',
      description:
        'Generate TypeScript schema definitions for a given version' +
        'of the Elastic Common Schema (ECS).',
      flags: {
        string: ['spec', 'dir'],
        alias: {
          s: 'spec',
          d: 'dir',
        },
        help: `
          --spec, -s    path to the ecs_nested.yml spec
          --dir, -d     directory where the generated file will be written
        `,
        default: {
          s: 'tmp/ecs_nested.yml',
          d: 'src/schemas',
        },
      },
      async run({ flags }) {
        const inputPath = flags.spec;
        const outputDir = flags.dir;

        if (inputPath === undefined || typeof inputPath !== 'string') {
          throw createFlagError('expected a single string --spec flag');
        }

        if (outputDir === undefined || typeof outputDir !== 'string') {
          throw createFlagError('expected a single string --dir flag');
        }

        execute(inputPath, outputDir);
      },
    })
    .execute();
}
