/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { run as runWithCli } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { discoverFiles } from './discover_files';
import { loadSchemaDocuments } from './load_schema';
import { createWorkerSchemaValidator } from './create_schema_validator';
import { validateWorkflowYaml } from './validate';
import { printFileResult, printSummary, writeJsonReport } from './report';
import { VARIANTS } from './types';
import type { ValidationOutcome, VariantMode } from './types';

type FlagValue = string | boolean | string[] | undefined;

const asOptionalString = (value: FlagValue): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const VARIANT_MODES: readonly VariantMode[] = ['auto', ...VARIANTS, 'managed'];

const parseVariantMode = (value: FlagValue): VariantMode => {
  const variant = typeof value === 'string' && value.length > 0 ? value : 'auto';
  if (!VARIANT_MODES.includes(variant as VariantMode)) {
    throw createFlagError(
      `Invalid --variant "${variant}". Expected one of: ${VARIANT_MODES.join(', ')}.`
    );
  }
  return variant as VariantMode;
};

export function run() {
  runCli().catch((error) => {
    // `run` already reports thrown errors; this guard is only for safety.
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}

const runCli = () =>
  runWithCli(
    async ({ log, flags }) => {
      const target = asOptionalString(flags._[0]) ?? '.';
      const recursive = Boolean(flags.recursive);
      // NB: `--silent`/`--quiet` are reserved by @kbn/dev-cli-runner (they mute the
      // ToolingLog entirely), so this uses its own flag name.
      const summaryOnly = Boolean(flags['summary-only']);
      const variantMode = parseVariantMode(flags.variant);
      const schema = asOptionalString(flags.schema);
      const cdnUrl =
        asOptionalString(flags['schema-cdn-url']) ??
        asOptionalString(process.env.KBN_WORKFLOW_SCHEMA_CDN_URL);
      const kibanaVersion = asOptionalString(flags['kibana-version']);
      const channel = asOptionalString(flags.channel);
      const jsonOutput = asOptionalString(flags.json);

      const files = discoverFiles(target, { recursive });
      if (files.length === 0) {
        log.warning(`No workflow YAML files found in ${target}. Nothing to validate.`);
        return;
      }

      const { schemas, source } = await loadSchemaDocuments({
        schema,
        cdnUrl,
        kibanaVersion,
        channel,
        log,
      });
      log.info(`Validating ${files.length} file(s) against schema from ${source}`);

      // The workflow schema is deeply recursive, so compile + validate in a worker
      // thread with an enlarged stack: this validates deeply-nested workflows
      // without overflowing the call stack.
      const { validateSchema, close } = createWorkerSchemaValidator({ schemas, log });
      const outcomes: ValidationOutcome[] = [];
      try {
        // Stream each file's result as it completes: validation is slow per file,
        // so a batched report at the end looks like a hang on large --recursive runs.
        // `--summary-only` suppresses the streaming and prints only failures + summary.
        for (const file of files) {
          const yaml = await fs.promises.readFile(file, 'utf8');
          const outcome = await validateWorkflowYaml({ file, yaml, validateSchema, variantMode });
          outcomes.push(outcome);
          if (!summaryOnly) {
            printFileResult(log, outcome);
          }
        }
      } finally {
        await close();
      }

      if (summaryOnly) {
        // Surface failures and pass-with-warnings files so skipped LiquidJS
        // positions are not silently hidden in summary-only mode.
        for (const outcome of outcomes) {
          if (!outcome.ok || outcome.issues.length > 0) {
            printFileResult(log, outcome);
          }
        }
      }
      printSummary(log, outcomes);

      if (jsonOutput) {
        writeJsonReport(jsonOutput, source, outcomes);
        log.info(`Wrote JSON report to ${jsonOutput}`);
      }

      if (outcomes.some((outcome) => !outcome.ok)) {
        process.exitCode = 1;
      }
    },
    {
      description:
        'Validate workflow YAML (a file or a folder) against the generated workflow step JSON ' +
        'Schema artifact, then layer step-name uniqueness, DAG validity, and LiquidJS syntax checks. ' +
        'Use --variant managed for kbn-workflows/managed definitions, which validates against the ' +
        'strict schema while tolerating install-time __SOMETHING__ placeholder tokens as warnings. ' +
        'The schema source resolves from --schema, then the local target dir, then --schema-cdn-url.',
      usage: 'node scripts/validate_workflow_yaml.js <file-or-dir> [flags]',
      flags: {
        boolean: ['recursive', 'summary-only'],
        string: ['variant', 'schema', 'schema-cdn-url', 'kibana-version', 'channel', 'json'],
        alias: { r: 'recursive' },
        help: `
        <file-or-dir>                  Workflow YAML file or a folder of them (default: current directory)
        --recursive, -r                Descend into subdirectories (default: top-level only)
        --summary-only                 Suppress per-file streaming; print only failures and the summary
        --variant <mode>               Schema variant: auto | strict | template | managed (default: auto). "managed" validates against strict and tolerates install-time __SOMETHING__ tokens
        --schema <path|url>            Explicit schema source: a bundle directory or an http(s):// base URL
        --schema-cdn-url <url>         CDN base URL fallback (or set KBN_WORKFLOW_SCHEMA_CDN_URL)
        --kibana-version <version>     Select a version under the local target dir (default: highest available)
        --channel <name>               Select a channel under the local target dir (default: release)
        --json <path>                  Write a structured JSON report to this path
      `,
      },
    }
  );
