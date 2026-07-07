/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { runValidation } from './src/run_validation';
import { renderJUnitXml } from './src/junit_report';

export { runValidation } from './src/run_validation';
export { validateExampleYaml } from './src/validate_example';
export type { ValidationOutcome, ValidationMode, SchemaIssue } from './src/validate_example';
export { buildWorkflowSchema } from './src/build_schema';
export { discoverExampleFiles } from './src/discover_examples';
export { renderJUnitXml } from './src/junit_report';
export type { ExampleResult } from './src/junit_report';

export function runValidateExamplesCli(): void {
  run(
    async ({ flagsReader, log }) => {
      const dir = flagsReader.requiredString('dir');
      const rootDir = Path.resolve(dir);
      const junitOutFlag = flagsReader.string('junit-out');
      const templateFlag = flagsReader.boolean('template');
      const plainFlag = flagsReader.boolean('plain');
      const strictFlag = flagsReader.boolean('strict');

      if (templateFlag && plainFlag) {
        throw createFailError('--template and --plain are mutually exclusive.');
      }

      const mode = templateFlag ? 'template' : plainFlag ? 'plain' : 'auto';

      const summary = await runValidation({ rootDir, log, mode, strict: strictFlag });

      if (junitOutFlag) {
        const junitPath = Path.resolve(junitOutFlag);
        await mkdir(Path.dirname(junitPath), { recursive: true });
        await writeFile(junitPath, renderJUnitXml(summary.results), 'utf8');
        log.info(`Wrote JUnit report to ${junitPath}`);
      }

      if (summary.empty && junitOutFlag) {
        throw createFailError(`No workflow YAML files found under ${rootDir}`);
      }

      if (summary.failed > 0) {
        throw createFailError(
          `${summary.failed} of ${summary.results.length} workflow example(s) failed validation`
        );
      }
    },
    {
      description:
        'Validate workflow YAML examples (from elastic/workflows or any directory) against the Kibana workflow schema.',
      usage:
        'node scripts/validate_workflow_examples --dir <path> [--template|--plain] [--strict] [--junit-out <path>]',
      flags: {
        string: ['dir', 'junit-out'],
        boolean: ['template', 'plain', 'strict'],
        help: `
          --dir            (required) Directory containing workflow YAML examples (.yml/.yaml).
                            The directory is walked recursively; dotfiles and hidden directories
                            are skipped.
          --template       Validate every YAML as a template workflow (must have a
                            \`template-metadata\` block). Fails if any file is not a template.
                            Mutually exclusive with --plain.
          --plain          Validate every YAML as a plain workflow implementation. Fails if any
                            file contains a \`template-metadata\` block.
                            Mutually exclusive with --template.
                            Default (no flag): auto-detect per file.
          --strict         Reject unknown schema keys. Without this flag the schema uses passthrough
                            mode (unknown keys are silently accepted). Recommended for authoritative
                            CI gates; elastic/workflows CI uses --strict with --plain or --template
                            to ensure only schema-defined properties appear.
          --junit-out      Optional path to write a JUnit XML report (consumed by Buildkite).
        `,
      },
    }
  );
}
