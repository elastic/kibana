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
import { filtersMatch } from './filters_match';
import { toInstancePathFilter } from './path_filters';
import { validateCompatibility } from './compatibility';
import {
  classifySchemaError,
  classifyRefError,
  countSeverities,
  hasSeverityIncrease,
  type OasIssue,
  type Baseline,
  type SeverityCounts,
} from './error_categorization';

const kibanaYamlRelativePath = './oas_docs/output/kibana.yaml';
const kibanaServerlessYamlRelativePath = './oas_docs/output/kibana.serverless.yaml';

const pluralize = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

run(
  async ({ log, flagsReader }) => {
    const paths = flagsReader.arrayOfStrings('path');
    const instancePathFilters = paths?.map((path) => toInstancePathFilter(path));
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

    function updateBaselineFile() {
      Fs.writeFileSync(baselineFile, JSON.stringify(severityCounts, null, 2) + '\n');
      log.success('Baseline file updated.');
    }

    let invalidSpec = false;
    let schemaValidationFailed = false;
    let compatibilityValidationFailed = false;
    const severityCounts: Baseline = {};
    const compatibilityErrorMessages: Record<string, string> = {};

    const yamlPaths: string[] = [];
    if (only === 'traditional') {
      yamlPaths.push(kibanaYamlRelativePath);
    } else if (only === 'serverless') {
      yamlPaths.push(kibanaServerlessYamlRelativePath);
    } else {
      yamlPaths.push(kibanaYamlRelativePath, kibanaServerlessYamlRelativePath);
    }

    for (const yamlPath of yamlPaths) {
      if (paths?.length) {
        if (!(await filtersMatch(paths, yamlPath))) {
          log.warning(
            `None of the provided --path filters matched any content in ${chalk.underline(
              yamlPath
            )}, are you sure these paths exist? Running the check anyway...`
          );
        }
      }
      log.info(`About to validate spec at ${chalk.underline(yamlPath)}`);
      await log.indent(4, async () => {
        const result = validate(yamlPath);
        const compatibilityResult = await validateCompatibility(yamlPath);

        let hasValidationIssues = false;

        const issues: OasIssue[] = [];
        if (!result.valid) {
          schemaValidationFailed = true;
          if (Array.isArray(result.errors)) {
            for (const error of result.errors) {
              const issue = classifySchemaError(error);
              if (issue) {
                issues.push(issue);
              }
            }
          } else if (typeof result.errors === 'string') {
            issues.push(classifyRefError(result.errors));
          }
        }

        const filteredIssues = instancePathFilters?.length
          ? issues.filter(
              (issue) =>
                issue.source !== 'schema' ||
                instancePathFilters.some((instancePathFilter) =>
                  issue.path.startsWith(instancePathFilter)
                )
            )
          : issues;

        const counts = countSeverities(filteredIssues);
        severityCounts[yamlPath] = counts;

        if (filteredIssues.length) {
          hasValidationIssues = true;
          if (counts.errors > 0) {
            invalidSpec = true;
          }
          log.warning(`${chalk.underline(yamlPath)} has validation issues`);

          if (!skipPrintingIssues) {
            const issueText = filteredIssues
              .map(({ path, message, schemaPath }) =>
                schemaPath
                  ? `${chalk.bold(path)}\n${message}\nFailed check @ schema path: ${schemaPath}`
                  : `${chalk.bold(path)}\n${message}`
              )
              .join('\n\n');
            log.warning('Found the following issues\n\n' + issueText + '\n');
          }

          log.warning(
            `${chalk.underline(yamlPath)}: ${chalk.bold(
              pluralize(counts.errors, 'error')
            )}, ${chalk.bold(pluralize(counts.warnings, 'warning'))}`
          );
        }

        if (compatibilityResult && !compatibilityResult.valid) {
          hasValidationIssues = true;
          compatibilityValidationFailed = true;
          invalidSpec = true;
          log.warning(`${chalk.underline(yamlPath)} failed compatibility validation`);

          let compatibilityErrorCount = 0;
          const compatibilityErrorMessage = compatibilityResult.issues
            .filter((issue) =>
              instancePathFilters?.length
                ? instancePathFilters.some((instancePathFilter) =>
                    issue.path.startsWith(instancePathFilter)
                  )
                : true
            )
            .map(({ path, message }) => {
              compatibilityErrorCount++;
              return `${chalk.bold(path)}\n${message}`;
            })
            .join('\n\n');

          if (compatibilityErrorMessage) {
            compatibilityErrorMessages[yamlPath] = compatibilityErrorMessage;
          }

          if (!skipPrintingIssues) {
            log.warning(
              'Found the following compatibility issues\n\n' + compatibilityErrorMessage + '\n'
            );
          }
          log.warning(
            `Found ${chalk.bold(compatibilityErrorCount)} compatibility errors in ${chalk.underline(
              yamlPath
            )}`
          );
        }

        if (!hasValidationIssues) {
          log.success(`${chalk.underline(yamlPath)} is valid`);
        }
      });
    }

    if (assertNoErrorIncrease) {
      const baseline: Baseline = JSON.parse(Fs.readFileSync(baselineFile, 'utf-8'));

      let report = '';
      for (const yamlPath of yamlPaths) {
        const prev: SeverityCounts = baseline[yamlPath] ?? { errors: 0, warnings: 0 };
        const curr = severityCounts[yamlPath];
        report += `\n${yamlPath}: ${formatAxis('errors', curr.errors, prev.errors)}, ${formatAxis(
          'warnings',
          curr.warnings,
          prev.warnings
        )}`;
      }
      log.info('Count comparison:' + report);
      if (compatibilityValidationFailed) {
        for (const yamlPath of yamlPaths) {
          if (!compatibilityErrorMessages[yamlPath]) {
            continue;
          }

          log.error(
            `Compatibility issues in ${chalk.underline(yamlPath)}\n\n${
              compatibilityErrorMessages[yamlPath]
            }\n`
          );
        }
        log.error('Compatibility validation failed.');
        process.exit(1);
      }
      if (hasSeverityIncrease(baseline, severityCounts, yamlPaths)) {
        log.error(
          'Error or warning count has increased compared to baseline, not updating the baseline count; exit(1).'
        );
        log.error(
          'To investigate this further see "node ./scripts/validate_oas_docs.js --help", or use the "debug-oas" and "validate-oas" skills.'
        );
        process.exit(1);
      } else {
        log.success('No error or warning increase detected.');
        if (updateBaseline) updateBaselineFile();
        process.exit(0);
      }
    }

    if (updateBaseline) updateBaselineFile();

    log.info('Validation complete');
    if (invalidSpec) {
      if (schemaValidationFailed) {
        log.info(
          `${chalk.bold(
            'TIP'
          )}: Use the "Failed check @ schema path <path>" to see the JSONSchema for the expected shape in:\n${OAS_3_0_SCHEMA_PATH}`
        );
      }
      process.exit(1);
    }

    // Warnings-only results exit 0 by design (errors gate the non-assert path).
    const totalWarnings = Object.values(severityCounts).reduce(
      (sum, { warnings }) => sum + warnings,
      0
    );
    if (totalWarnings > 0) {
      log.warning(
        `Found ${pluralize(totalWarnings, 'warning')} and no errors in the OAS spec; exiting 0.`
      );
    } else {
      log.success('No errors found in the OAS spec');
    }
    process.exit(0);
  },
  {
    description: 'Validate Kibana OAS YAML files (in oas_docs/output)',
    usage: 'node ./scripts/validate_oas_docs.js',
    flags: {
      boolean: ['assert-no-error-increase', 'update-baseline', 'skip-printing-issues'],
      string: ['path', 'only'],
      help: `
      --assert-no-error-increase  Gates CI on both the error AND warning counts per bundle. Despite the flag name, a warning increase also fails — a quality-warning increase can mask a structural regression hiding behind a description cleanup. Fails if either axis rises above baseline for any bundle.
      --update-baseline          Update or create the baseline file with current { errors, warnings } counts.
      --path                     Pass in the (start of) a custom API route path (for example /api/fleet/agent_policies), can be specified multiple times.
      --only                     Validate only OAS for the a specific offering, one of "traditional" or "serverless". Omitting this will validate all offerings.
      --skip-printing-issues     Do not print the errors found in the OAS spec, only the count of errors and warnings.
`,
      examples: `
node ./scripts/validate_oas_docs.js
node ./scripts/validate_oas_docs.js --path /api/fleet/agent_policies --path /api/fleet/agent_policies
node ./scripts/validate_oas_docs.js --only serverless --path /api/fleet/agent_policies
node ./scripts/validate_oas_docs.js --assert-no-error-increase --update-baseline
`,
    },
  }
);

function formatAxis(label: string, curr: number, prev: number): string {
  if (curr > prev) {
    return chalk.red(`${label} ${chalk.bold(curr)} (was ${prev})`);
  }
  if (curr === prev) {
    return chalk.yellow(`${label} ${chalk.bold(curr)} (baseline ${prev})`);
  }
  return chalk.green(`${label} ${chalk.bold(curr)} (was ${prev})`);
}
