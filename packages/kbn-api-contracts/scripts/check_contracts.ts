/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
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
import { filterSpecPaths, type PathFilterOptions } from '../src/filter/filter_paths';
import { checkTerraformImpact } from '../src/terraform/check_terraform_impact';

interface CheckContractsOptions {
  distribution: Distribution;
  specPath: string;
  version?: string;
  baselinePath?: string;
  allowlistPath?: string;
  terraformApisPath?: string;
  include?: string[];
  exclude?: string[];
}

const parseArrayFlag = (value: string | string[] | undefined): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return value.split(',').map((s) => s.trim());
};

const getDefaultSpecPath = (distribution: Distribution): string =>
  distribution === 'stack'
    ? 'oas_docs/output/kibana.yaml'
    : 'oas_docs/output/kibana.serverless.yaml';

const validateDistribution = (distribution: string | undefined): Distribution => {
  if (!distribution || !['stack', 'serverless'].includes(distribution)) {
    throw new Error('--distribution must be either "stack" or "serverless"');
  }
  return distribution as Distribution;
};

const logConfiguration = (log: ToolingLog, opts: CheckContractsOptions) => {
  log.info(`Checking ${opts.distribution} API contracts...`);
  log.info(`Current spec: ${opts.specPath}`);
  if (opts.include?.length) log.info(`Include filter: ${opts.include.join(', ')}`);
  if (opts.exclude?.length) log.info(`Exclude filter: ${opts.exclude.join(', ')}`);
};

const checkGovernance = (log: ToolingLog, distribution: Distribution, baselinePath: string) => {
  const governance = checkBaselineGovernance(distribution, baselinePath);
  if (!governance.allowed) {
    log.error(governance.reason!);
    throw new Error('Baseline governance check failed');
  }
};

const loadAndNormalizeCurrentSpec = async (specPath: string) => {
  const spec = await loadOas(resolve(process.cwd(), specPath));
  return normalizeOas(spec);
};

const applyFilters = (
  baseline: ReturnType<typeof normalizeOas>,
  current: ReturnType<typeof normalizeOas>,
  filterOptions: PathFilterOptions
) => ({
  filteredBaseline: filterSpecPaths(baseline, filterOptions),
  filteredCurrent: filterSpecPaths(current, filterOptions),
});

run(
  async ({ flags, log }) => {
    const distribution = validateDistribution(flags.distribution as string);
    const opts: CheckContractsOptions = {
      distribution,
      specPath: (flags.specPath as string) || getDefaultSpecPath(distribution),
      version: flags.version as string | undefined,
      baselinePath: flags.baselinePath as string | undefined,
      allowlistPath: flags.allowlistPath as string | undefined,
      terraformApisPath: flags.terraformApisPath as string | undefined,
      include: parseArrayFlag(flags.include as string | string[] | undefined),
      exclude: parseArrayFlag(flags.exclude as string | string[] | undefined),
    };

    logConfiguration(log, opts);

    const baselineSelection = selectBaseline(opts.distribution, opts.version, opts.baselinePath);
    log.info(`Baseline: ${baselineSelection.path}`);

    checkGovernance(log, opts.distribution, baselineSelection.path);

    const normalizedCurrent = await loadAndNormalizeCurrentSpec(opts.specPath);
    const baseline = await loadBaseline(baselineSelection.path);

    if (!baseline) {
      log.warning('No baseline found - skipping check');
      return;
    }

    const { filteredBaseline, filteredCurrent } = applyFilters(normalizedCurrent, baseline, {
      include: opts.include,
      exclude: opts.exclude,
    });

    const allowlist = loadAllowlist(opts.allowlistPath);
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

    const terraformImpact = checkTerraformImpact(breakingChanges, opts.terraformApisPath);
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
