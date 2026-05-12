/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildPublicWorkflowSchema } from './build_schema';
import { discoverExampleFiles } from './discover_examples';
import type { ExampleResult } from './junit_report';
import { validateExampleYaml, type ValidationOutcome } from './validate_example';

export interface RunOptions {
  readonly rootDir: string;
  readonly log: ToolingLog;
}

export interface RunSummary {
  readonly results: readonly ExampleResult[];
  readonly passed: number;
  readonly failed: number;
}

export async function runValidation({ rootDir, log }: RunOptions): Promise<RunSummary> {
  const files = await discoverExampleFiles(rootDir);
  if (files.length === 0) {
    log.warning(`No workflow YAML files found under ${rootDir}`);
    return { results: [], passed: 0, failed: 0 };
  }
  log.info(`Validating ${files.length} example(s) under ${rootDir}`);

  const schema = buildPublicWorkflowSchema();
  const results: ExampleResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const relative = Path.relative(rootDir, file);
    const start = process.hrtime.bigint();
    const outcome = await validateOne(file, schema);
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    results.push({ name: relative, file, durationSeconds, outcome });
    if (outcome.kind === 'ok') {
      passed += 1;
      log.success(`✓ ${relative}`);
    } else {
      failed += 1;
      log.error(`✗ ${relative}\n${describeOutcome(outcome)}`);
    }
  }

  log.info(`Validated ${files.length} example(s): ${passed} passed, ${failed} failed`);
  return { results, passed, failed };
}

async function validateOne(
  file: string,
  schema: ReturnType<typeof buildPublicWorkflowSchema>
): Promise<ValidationOutcome> {
  let yaml: string;
  try {
    yaml = await readFile(file, 'utf8');
  } catch (error) {
    return {
      kind: 'unexpected-error',
      message: `Failed to read file: ${(error as Error).message}`,
    };
  }
  return validateExampleYaml(yaml, schema);
}

function describeOutcome(outcome: Exclude<ValidationOutcome, { kind: 'ok' }>): string {
  switch (outcome.kind) {
    case 'oversize':
      return `  oversize: ${outcome.bytes} > ${outcome.limit} bytes`;
    case 'syntax-error':
      return `  yaml syntax: ${outcome.message}`;
    case 'schema-error':
      return outcome.issues.map((i) => `  ${i.path}: ${i.message}`).join('\n');
    case 'unexpected-error':
      return `  unexpected: ${outcome.message}`;
  }
}
