/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { getKibanaDir } from '#pipeline-utils/get_kibana_dir';
import { renderSteps } from './render.ts';
import { cpsTests } from './steps.ts';

// Converts numeric-string exit statuses to integers to match the Buildkite schema.
const normalizeExitStatus = (document: { steps: Array<Record<string, unknown>> }) => ({
  ...document,
  steps: document.steps.map((step) => {
    const automatic = (step.retry as { automatic?: unknown } | undefined)?.automatic;
    if (!Array.isArray(automatic)) {
      return step;
    }
    return {
      ...step,
      retry: {
        automatic: automatic.map((rule: { exit_status: unknown }) =>
          typeof rule.exit_status === 'string' && /^-?\d+$/.test(rule.exit_status)
            ? { ...rule, exit_status: Number(rule.exit_status) }
            : rule
        ),
      },
    };
  }),
});

describe('cpsTests', () => {
  it('renders the same pipeline as cps_testing.yml, apart from the integer exit status', () => {
    const rendered = parse(renderSteps(cpsTests(), { header: true }));
    const yaml = parse(
      fs.readFileSync(
        path.join(getKibanaDir(), '.buildkite/pipelines/pull_request/cps_testing.yml'),
        'utf8'
      )
    );

    // The two differ only by the type of the exit status. Normalized, they match.
    expect(rendered).not.toEqual(yaml);
    expect(rendered).toEqual(normalizeExitStatus(yaml));
  });
});
