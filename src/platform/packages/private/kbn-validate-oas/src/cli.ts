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
import { validate, OAS_3_0_SCHEMA_PATH } from './validate';

const kibanaYamlRelativePath = './oas_docs/output/kibana.yaml';
const kibanaServerlessYamlRelativePath = './oas_docs/output/kibana.serverless.yaml';

run(
  async ({ log, flagsReader }) => {
    const paths = flagsReader.arrayOfStrings('path');
    const only = flagsReader.string('only') as 'traditional' | 'serverless' | undefined;
    const assertNoErrorIncrease = flagsReader.boolean('assert-no-error-increase');
    const skipPrintingIssues = flagsReader.boolean('skip-printing-issues');
    const updateBaseline = flagsReader.boolean('update-baseline');

    if (only && only !== 'traditional' && only !== 'serverless') {
      log.error('Invalid value for --only flag, must be "traditional" or "serverless"');
      process.exit(1);
    }

    if (paths?.length && assertNoErrorIncrease) {
      log.error(
        'Cannot use --assert-no-error-increase with --path, please run without --path to assert no error increase.'
      );
      process.exit(1);
    }

    const baselineFile = Path.resolve(__dirname, './oas_error_baseline.json');
    if (assertNoErrorIncrease) {
      if (!Fs.existsSync(baselineFile)) {
        log.error(
          `No file baseline found at ${baselineFile}. First generate a baseline file by running --update-baseline by running without --assert-no-error-increase.`
        );
        process.exit(1);
      }
    }

    // Baseline file location
    function updateBaselineFile() {
      Fs.writeFileSync(baselineFile, JSON.stringify(errorCounts, null, 2));
      log.success('Baseline file updated.');
    }

    let invalidSpec = false;
    const errorCounts: Record<string, number> = {};

    const yamlPaths: string[] = [];
    if (only === 'traditional') {
      yamlPaths.push(kibanaYamlRelativePath);
    } else if (only === 'serverless') {
      yamlPaths.push(kibanaServerlessYamlRelativePath);
    } else {
      yamlPaths.push(kibanaYamlRelativePath, kibanaServerlessYamlRelativePath);
    }

    for (const yamlPath of yamlPaths) {
      log.info(`About to validate spec at ${chalk.underline(yamlPath)}`);
      await log.indent(4, async () => {
        const result = validate(yamlPath);
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
              .map(({ instancePath, message, schemaPath }) => {
                errorCount++;
                return `${chalk.bold(
                  instancePath
                )}\n${message}\nFailed check @ schema path: ${schemaPath}`;
              })
              .join('\n\n');
          } else if (typeof result.errors === 'string') {
            errorCount = 1;
            errorMessage = result.errors;
          }

          if (!skipPrintingIssues) {
            log.warning('Found the following issues\n\n' + errorMessage + '\n');
          }
          errorCounts[yamlPath] = errorCount;
          log.warning(`Found ${chalk.bold(errorCount)} errors in ${chalk.underline(yamlPath)}`);
          invalidSpec = true;
        } else {
          log.success(`${chalk.underline(yamlPath)} is valid`);
        }
      });
    }

    if (assertNoErrorIncrease) {
      const baseline: Record<string, number> = JSON.parse(Fs.readFileSync(baselineFile, 'utf-8'));

      let increased = false;
      let report = '';
      for (const yamlPath of yamlPaths) {
        const prev = baseline[yamlPath];
        const curr = errorCounts[yamlPath];
        if (curr > prev) {
          increased = true;
          report += `\n${chalk.red(yamlPath)}: ${chalk.bold(curr)} errors (was ${prev})`;
        } else if (curr === prev) {
          report += `\n${chalk.yellow(yamlPath)}: ${chalk.bold(curr)} errors (baseline ${prev})`;
        } else {
          report += `\n${chalk.green(yamlPath)}: ${chalk.bold(curr)} errors (was ${prev})`;
        }
      }
      log.info('Count comparison:' + report);
      if (increased) {
        log.error(
          'Error count has increased compared to baseline, not updating the baseline count; exit(1).'
        );
        log.error('To investigate this further see "node ./scripts/validate_oas_docs.js --help".');
        process.exit(1);
      } else {
        log.success('No error increase detected.');
        if (updateBaseline) updateBaselineFile();
        process.exit(0);
      }
    }

    if (updateBaseline) updateBaselineFile();

    log.info('Validation complete');
    if (invalidSpec) {
      log.info(
        `${chalk.bold(
          'TIP'
        )}: Use the "Failed check @ schema path <path>" to see the JSONSchema for the expected shape in:\n${OAS_3_0_SCHEMA_PATH}`
      );
      process.exit(1);
    }
  },
  {
    description: 'Validate Kibana OAS YAML files (in oas_docs/output)',
    usage: 'node ./scripts/validate_oas_docs.js',
    flags: {
      boolean: ['assert-no-error-increase', 'update-baseline', 'skip-printing-issues'],
      string: ['path', 'only'],
      help: `
      --assert-no-error-increase  Will error if the number of errors in the OAS spec compared to the baseline has increased. Cannot be combined with other flags.
      --update-baseline          Update or create the baseline file with current error counts.
      --path                     Pass in the (start of) a custom path to focus OAS validation error reporting, can be specified multiple times.
      --only                     Validate only OAS for the a specific offering, one of "traditional" or "serverless". Omitting this will validate all offerings.
      --skip-printing-issues     Do not print the errors found in the OAS spec, only the count of errors.
`,
      examples: `
node ./scripts/validate_oas_docs.js
node ./scripts/validate_oas_docs.js --path /paths/~1api~1fleet~1agent_policies --path /paths/~1api~1fleet~1agent_policies
node ./scripts/validate_oas_docs.js --only serverless --path /paths/~1api~1fleet~1agent_policies
node ./scripts/validate_oas_docs.js --assert-no-error-increase --update-baseline
`,
    },
  }
);
