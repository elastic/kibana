/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import Fs from 'node:fs';
import chalk from 'chalk';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

const kibanaYamlPath = Path.resolve(REPO_ROOT, './oas_docs/output/kibana.yaml');
const kibanaServerlessYamlPath = Path.resolve(
  REPO_ROOT,
  './oas_docs/output/kibana.serverless.yaml'
);

run(
  async ({ log, flagsReader }) => {
    const paths = flagsReader.arrayOfStrings('path');
    const only = flagsReader.string('only') as 'traditional' | 'serverless' | undefined;
    if (only && only !== 'traditional' && only !== 'serverless') {
      log.error('Invalid value for --only flag, must be "traditional" or "serverless"');
      process.exit(1);
    }
    // Load CommonJS version
    const { Validator } = await import('@seriousme/openapi-schema-validator');
    const validator = new Validator({ strict: false, allErrors: true });

    let invalidSpec = false;

    const yamlPaths: string[] = [];

    if (only === 'traditional') {
      yamlPaths.push(kibanaYamlPath);
    } else if (only === 'serverless') {
      yamlPaths.push(kibanaServerlessYamlPath);
    } else {
      yamlPaths.push(kibanaYamlPath, kibanaServerlessYamlPath);
    }

    for (const yamlPath of yamlPaths) {
      log.info(`About to validate spec at ${chalk.underline(yamlPath)}`);
      await log.indent(4, async () => {
        const result = await validator.validate(Fs.readFileSync(yamlPath).toString('utf-8'));
        if (!result.valid) {
          log.warning(`${chalk.underline(yamlPath)} is NOT valid`);

          let errorMessage: undefined | string;
          let errorCount = 0;

          if (Array.isArray(result.errors)) {
            errorMessage = result.errors
              .filter(
                (error) =>
                  // The below is noisey and a result of how the schema validation works. No aspect of the OAS spec should
                  // require the use of `$ref`, it's an optional optimization.
                  error.params.missingProperty !== '$ref' &&
                  error.params.passingSchemas !== null &&
                  (paths?.length ? paths.some((path) => error.instancePath.startsWith(path)) : true)
              )
              .map(({ instancePath, message }) => {
                errorCount++;
                return `${chalk.gray(instancePath)}\n${message}`;
              })
              .join('\n\n');
          } else if (typeof result.errors === 'string') {
            errorCount = 1;
            errorMessage = result.errors;
          }
          log.warning('Found the following issues\n\n' + errorMessage + '\n');
          log.warning(`Found ${chalk.bold(errorCount)} errors in ${chalk.underline(yamlPath)}`);
          invalidSpec = true;
        } else {
          log.success(`${chalk.underline(yamlPath)} is valid`);
        }
      });
    }

    log.info('Done');
    if (invalidSpec) {
      process.exit(1);
    }
  },
  {
    description: 'Validate Kibana OAS YAML files (in oas_docs/output)',
    usage: 'node ./scripts/validate_oas_docs.js',
    flags: {
      string: ['path', 'only'],
      help: `
      --path             Pass in the (start of) a custom path to focus OAS validation error reporting, can be specified multiple times.
      --only             Validate only OAS for the a specific offering, one of "traditional" or "serverless". Omitting this will validate all offerings.
`,
      examples: `
node ./scripts/validate_oas_docs.js
node ./scripts/validate_oas_docs.js --path /paths/~1api~1fleet~1agent_policies --path /paths/~1api~1fleet~1agent_policies
node ./scripts/validate_oas_docs.js --only serverless --path /paths/~1api~1fleet~1agent_policies
`,
    },
  }
);
