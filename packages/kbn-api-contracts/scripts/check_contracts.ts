/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { runBumpDiff } from '../src/diff/run_bump_diff';
import { parseBumpDiff } from '../src/diff/parse_bump_diff';
import { applyAllowlist } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';
import { loadAllowlist } from '../src/allowlist/load_allowlist';
import { checkTerraformImpact } from '../src/terraform/check_terraform_impact';

type Distribution = 'stack' | 'serverless';

interface CheckContractsOptions {
  distribution: Distribution;
  specPath: string;
  baseBranch: string;
  allowlistPath?: string;
  terraformApisPath?: string;
}

const TMP_DIR = resolve(__dirname, '..', 'target', 'tmp');

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

const getBaseOasPath = (specPath: string, baseBranch: string): string | null => {
  mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = resolve(TMP_DIR, `base-${Date.now()}.yaml`);

  try {
    // git show retrieves the file content directly
    const baseContent = execSync(`git show origin/${baseBranch}:${specPath}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    writeFileSync(tmpPath, baseContent);
    return tmpPath;
  } catch {
    // Try fetching if git show fails (stale refs)
    try {
      execSync(`git fetch origin ${baseBranch} --depth=1`, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const baseContent = execSync(`git show origin/${baseBranch}:${specPath}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      writeFileSync(tmpPath, baseContent);
      return tmpPath;
    } catch {
      return null; // Basebranch doesn't have this file yet
    }
  }
};

const cleanup = (tmpPath: string) => {
  if (tmpPath) {
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      // best effort
    }
  }
};

run(
  async ({ flags, log }) => {
    const distribution = validateDistribution(flags.distribution as string);
    const opts: CheckContractsOptions = {
      distribution,
      specPath: (flags.specPath as string) || getDefaultSpecPath(distribution),
      baseBranch: (flags.baseBranch as string) || 'main',
      allowlistPath: flags.allowlistPath as string | undefined,
      terraformApisPath: flags.terraformApisPath as string | undefined,
    };

    log.info(`Checking ${opts.distribution} API contracts...`);
    log.info(`Current spec: ${opts.specPath}`);
    log.info(`Base branch: ${opts.baseBranch}`);

    const basePath = getBaseOasPath(opts.specPath, opts.baseBranch);
    if (!basePath) {
      log.warning(`No base OAS found on origin/${opts.baseBranch} - skipping check`);
      return;
    }

    try {
      const currentPath = resolve(process.cwd(), opts.specPath);
      const diffEntries = runBumpDiff(basePath, currentPath);
      const allBreakingChanges = parseBumpDiff(diffEntries);

      if (allBreakingChanges.length === 0) {
        log.success('No breaking changes detected');
        return;
      }

      const terraformImpact = checkTerraformImpact(allBreakingChanges, opts.terraformApisPath);

      const tfBreakingChanges = terraformImpact.hasImpact
        ? terraformImpact.impactedChanges.map((i) => i.change)
        : [];

      if (tfBreakingChanges.length === 0) {
        log.success(
          `${allBreakingChanges.length} breaking change(s) detected, none affect Terraform provider APIs`
        );
        return;
      }

      const allowlist = loadAllowlist(opts.allowlistPath);
      const { breakingChanges, allowlistedChanges } = applyAllowlist(tfBreakingChanges, allowlist);

      if (allowlistedChanges.length > 0) {
        log.info(`${allowlistedChanges.length} allowlisted change(s) ignored`);
      }

      if (breakingChanges.length === 0) {
        log.success('All Terraform-impacting breaking changes are allowlisted');
        return;
      }

      const report = formatFailure(breakingChanges, terraformImpact);
      log.error(report);
      throw new Error(
        `Found ${breakingChanges.length} breaking change(s) affecting Terraform provider APIs`
      );
    } finally {
      cleanup(basePath);
    }
  },
  {
    description: 'Check API contracts for breaking changes affecting Terraform provider APIs',
    flags: {
      string: ['distribution', 'specPath', 'baseBranch', 'allowlistPath', 'terraformApisPath'],
      help: `
        --distribution       Required. Either "stack" or "serverless"
        --specPath           Path to the current OpenAPI spec (default: oas_docs/output/kibana*.yaml)
        --baseBranch         Base branch to compare against (default: main)
        --allowlistPath      Override allowlist path (default: packages/kbn-api-contracts/allowlist.json)
        --terraformApisPath  Override Terraform provider APIs config path

        Examples:
          # Check serverless contracts against main
          node scripts/check_contracts.ts --distribution serverless

          # Check stack contracts against main
          node scripts/check_contracts.ts --distribution stack

          # Check against a different base branch
          node scripts/check_contracts.ts --distribution stack --baseBranch 9.3
      `,
    },
  }
);
