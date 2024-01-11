/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import yargs from 'yargs/yargs';
import { generate } from './openapi_generator';
import { AVAILABLE_TEMPLATES } from './template_service/template_service';

export function runCli() {
  yargs(process.argv.slice(2))
    .command(
      '*',
      'Generate code artifacts from OpenAPI specifications',
      (y) =>
        y
          .option('rootDir', {
            describe: 'Root directory to search for OpenAPI specs',
            demandOption: true,
            string: true,
          })
          .option('sourceGlob', {
            describe: 'Elasticsearch target',
            default: './**/*.schema.yaml',
            string: true,
          })
          .option('templateName', {
            describe: 'Template to use for code generation',
            default: 'zod_operation_schema' as const,
            choices: AVAILABLE_TEMPLATES,
          })
          .option('skipLinting', {
            describe: 'Whether linting should be skipped',
            type: 'boolean',
            default: false,
          })
          .showHelpOnFail(false),
      (argv) => {
        generate(argv).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(err);
          process.exit(1);
        });
      }
    )
    .parse();
}
