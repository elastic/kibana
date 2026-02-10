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
import { filterBreakingChangesWithAllowlist } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';
import { checkBaselineGovernance } from '../src/governance/check_baseline_governance';
import { loadAllowlist } from '../src/allowlist/load_allowlist';
import { filterSpecPaths } from '../src/filter/filter_paths';
import { checkTerraformImpact } from '../src/terraform/check_terraform_impact';

const parseArrayFlag = (value: string | string[] | undefined): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return value.split(',').map((s) => s.trim());
};

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
    const include = parseArrayFlag(flags.include as string | string[] | undefined);
    const exclude = parseArrayFlag(flags.exclude as string | string[] | undefined);

    if (!distribution || !['stack', 'serverless'].includes(distribution)) {
      throw new Error('--distribution must be either "stack" or "serverless"');
    }

    log.info(`Checking ${distribution} API contracts...`);
    log.info(`Current spec: ${specPath}`);

    if (include?.length) {
      log.info(`Include filter: ${include.join(', ')}`);
    }
    if (exclude?.length) {
      log.info(`Exclude filter: ${exclude.join(', ')}`);
    }

    const baselineSelection = selectBaseline(distribution, version, baselinePath);
    log.info(`Baseline: ${baselineSelection.path}`);

    const governance = checkBaselineGovernance(distribution, baselineSelection.path);
    if (!governance.allowed) {
      log.error(governance.reason!);
      throw new Error('Baseline governance check failed');
    }

    const currentSpec = await loadOas(resolve(process.cwd(), specPath));
    const normalizedCurrent = normalizeOas(currentSpec);

    const baseline = await loadBaseline(baselineSelection.path);

    if (!baseline) {
      log.warning('No baseline found - skipping check');
      return;
    }

    const filterOptions = { include, exclude };
    const filteredBaseline = filterSpecPaths(baseline, filterOptions);
    const filteredCurrent = filterSpecPaths(normalizedCurrent, filterOptions);

    const allowlistPath = flags.allowlistPath as string | undefined;
    const allowlist = loadAllowlist(allowlistPath);

    const diff = diffOas(filteredBaseline, filteredCurrent);
    const { breakingChanges, allowlistedChanges } = filterBreakingChangesWithAllowlist(
      diff,
      allowlist
    );

    if (allowlistedChanges.length > 0) {
      log.info(`${allowlistedChanges.length} allowlisted change(s) ignored`);
    }

    if (breakingChanges.length === 0) {
      log.success('No breaking changes detected');
      return;
    }

    const terraformApisPath = flags.terraformApisPath as string | undefined;
    const terraformImpact = checkTerraformImpact(breakingChanges, terraformApisPath);

    const report = formatFailure(breakingChanges, terraformImpact);
    log.error(report);
    throw new Error(`Found ${breakingChanges.length} breaking change(s)`);
  },
  {
    flags: {
      string: [
        'distribution',
        'specPath',
        'version',
        'baselinePath',
        'allowlistPath',
        'include',
        'exclude',
        'terraformApisPath',
      ],
      help: `
        --distribution       Required. Either "stack" or "serverless"
        --specPath           Path to the current OpenAPI spec (default: oas_docs/output/kibana*.yaml)
        --version            Semver version for stack baseline selection
        --baselinePath       Override baseline path for testing
        --allowlistPath      Override allowlist path (default: packages/kbn-api-contracts/allowlist.json)
        --include            Glob pattern(s) to include paths (comma-separated or multiple flags)
        --exclude            Glob pattern(s) to exclude paths (comma-separated or multiple flags)
        --terraformApisPath  Override Terraform provider APIs config path

        Examples:
          # Check serverless contracts against baseline
          node scripts/check_contracts.ts --distribution serverless

          # Check stack contracts for version 9.2.0
          node scripts/check_contracts.ts --distribution stack --version 9.2.0

          # Check only Fleet APIs
          node scripts/check_contracts.ts --distribution stack --include "/api/fleet/**"

          # Exclude internal APIs
          node scripts/check_contracts.ts --distribution stack --exclude "/api/internal/**"

          # Check with custom spec and baseline paths
          node scripts/check_contracts.ts --distribution stack --version 9.2.0 \\
            --specPath path/to/spec.yaml --baselinePath path/to/baseline.yaml
      `,
    },
  }
);
