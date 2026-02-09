/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { loadOas } from '../src/input/load_oas';
import { normalizeOas } from '../src/input/normalize_oas';
import { selectBaseline, type Distribution } from '../src/baseline/select_baseline';
import { loadBaseline } from '../src/baseline/load_baseline';
import { diffOas } from '../src/diff/diff_oas';
import { filterBreakingChanges } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';

run(
  async ({ flags, log }) => {
    const distribution = flags.distribution as Distribution;
    const specPath =
      (flags.specPath as string) ||
      (distribution === 'stack'
        ? 'oas_docs/output/kibana.yaml'
        : 'oas_docs/output/kibana.serverless.yaml');
    const version = flags.version as string | undefined;
    const baselinePath = flags.baselinePath as string | undefined;

    if (!distribution || !['stack', 'serverless'].includes(distribution)) {
      throw new Error('--distribution must be either "stack" or "serverless"');
    }

    log.info(`Checking ${distribution} API contracts...`);
    log.info(`Current spec: ${specPath}`);

    const currentSpec = await loadOas(resolve(process.cwd(), specPath));
    const normalizedCurrent = normalizeOas(currentSpec);

    const baselineSelection = selectBaseline(distribution, version, baselinePath);
    log.info(`Baseline: ${baselineSelection.path}`);

    const baseline = await loadBaseline(baselineSelection.path);

    if (!baseline) {
      log.warning('No baseline found - skipping check');
      return;
    }

    const diff = diffOas(baseline, normalizedCurrent);
    const breakingChanges = filterBreakingChanges(diff);

    if (breakingChanges.length === 0) {
      log.success('No breaking changes detected');
      return;
    }

    const report = formatFailure(breakingChanges);
    log.error(report);
    throw new Error(`Found ${breakingChanges.length} breaking change(s)`);
  },
  {
    flags: {
      string: ['distribution', 'specPath', 'version', 'baselinePath'],
      help: `
        --distribution     Required. Either "stack" or "serverless"
        --specPath         Path to the current OpenAPI spec (default: oas_docs/output/kibana*.yaml)
        --version          Semver version for stack baseline selection
        --baselinePath     Override baseline path for testing

        Examples:
          # Check serverless contracts against baseline
          node scripts/check_contracts.ts --distribution serverless

          # Check stack contracts for version 9.2.0
          node scripts/check_contracts.ts --distribution stack --version 9.2.0

          # Check with custom spec and baseline paths
          node scripts/check_contracts.ts --distribution stack --version 9.2.0 \\
            --specPath path/to/spec.yaml --baselinePath path/to/baseline.yaml
      `,
    },
  }
);
