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
import { BumpServiceError } from '../src/diff/errors';
import { parseBumpDiff } from '../src/diff/parse_bump_diff';
import { applyAllowlist } from '../src/diff/breaking_rules';
import { formatFailure } from '../src/report/format_failure';
import { loadAllowlist } from '../src/allowlist/load_allowlist';
import { checkTerraformImpact } from '../src/terraform/check_terraform_impact';

type Distribution = 'stack' | 'serverless';

const GIT_SHOW_MAX_BUFFER = 50 * 1024 * 1024;

interface CheckContractsOptions {
  distribution: Distribution;
  specPath: string;
  baseBranch: string;
  mergeBase?: string;
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

const resolveElasticRemote = (): string => {
  try {
    const remoteOutput = execSync('git remote -v', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = remoteOutput
      .split('\n')
      .find(
        (line) =>
          line.toLowerCase().includes('github.com/elastic/kibana') ||
          line.toLowerCase().includes('github.com:elastic/kibana')
      );
    if (match) {
      return match.split(/\t|\s/)[0];
    }
  } catch {
    // fall through
  }
  return 'origin';
};

const isFileNotInCommit = (error: unknown): boolean => {
  const stderr = (error as { stderr?: Buffer | string })?.stderr?.toString() ?? '';
  return stderr.includes('does not exist in') || stderr.includes('path not found');
};

const getBaseOasFromMergeBase = (specPath: string, mergeBase: string): string | null => {
  mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = resolve(TMP_DIR, `base-${Date.now()}.yaml`);

  try {
    const baseContent = execSync(`git show ${mergeBase}:${specPath}`, {
      encoding: 'utf-8',
      maxBuffer: GIT_SHOW_MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    writeFileSync(tmpPath, baseContent);
    return tmpPath;
  } catch (error) {
    if (isFileNotInCommit(error)) {
      return null;
    }
    throw error;
  }
};

const getBaseOasFromRemote = (
  specPath: string,
  baseBranch: string,
  remote: string
): string | null => {
  mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = resolve(TMP_DIR, `base-${Date.now()}.yaml`);

  try {
    const baseContent = execSync(`git show ${remote}/${baseBranch}:${specPath}`, {
      encoding: 'utf-8',
      maxBuffer: GIT_SHOW_MAX_BUFFER,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    writeFileSync(tmpPath, baseContent);
    return tmpPath;
  } catch {
    execSync(`git fetch ${remote} ${baseBranch} --depth=1`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    try {
      const baseContent = execSync(`git show ${remote}/${baseBranch}:${specPath}`, {
        encoding: 'utf-8',
        maxBuffer: GIT_SHOW_MAX_BUFFER,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      writeFileSync(tmpPath, baseContent);
      return tmpPath;
    } catch (error) {
      if (isFileNotInCommit(error)) {
        return null;
      }
      throw error;
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
      mergeBase: (flags.mergeBase as string) || undefined,
      allowlistPath: (flags.allowlistPath as string) || undefined,
      terraformApisPath: (flags.terraformApisPath as string) || undefined,
    };

    log.info(`Checking ${opts.distribution} API contracts...`);
    log.info(`Current spec: ${opts.specPath}`);

    let basePath: string | null;
    if (opts.mergeBase) {
      log.info(`Using merge base: ${opts.mergeBase}`);
      basePath = getBaseOasFromMergeBase(opts.specPath, opts.mergeBase);
    } else {
      const remote = resolveElasticRemote();
      log.info(`Base: ${remote}/${opts.baseBranch}`);
      basePath = getBaseOasFromRemote(opts.specPath, opts.baseBranch, remote);
    }

    if (!basePath) {
      log.warning('No base OAS found - skipping check');
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
    } catch (error) {
      if (error instanceof BumpServiceError) {
        log.warning(`${error.message}`);
        log.warning(
          'Skipping API contract check — results are inconclusive due to external service failure.'
        );
        return;
      }
      throw error;
    } finally {
      cleanup(basePath);
    }
  },
  {
    description: 'Check API contracts for breaking changes affecting Terraform provider APIs',
    flags: {
      string: [
        'distribution',
        'specPath',
        'baseBranch',
        'mergeBase',
        'allowlistPath',
        'terraformApisPath',
      ],
      help: `
        --distribution       Required. Either "stack" or "serverless"
        --specPath           Path to the current OpenAPI spec (default: oas_docs/output/kibana*.yaml)
        --baseBranch         Base branch to compare against (default: main)
        --mergeBase          Merge base commit SHA (used in CI, skips remote resolution)
        --allowlistPath      Override allowlist path (default: packages/kbn-api-contracts/allowlist.json)
        --terraformApisPath  Override Terraform provider APIs config path

        Examples:
          # CI: check using merge base SHA
          node scripts/check_contracts.ts --distribution stack --mergeBase abc123

          # Local: check stack contracts against main (auto-detects elastic/kibana remote)
          node scripts/check_contracts.ts --distribution stack

          # Local: check serverless contracts against main
          node scripts/check_contracts.ts --distribution serverless

          # Local: check against a specific branch
          node scripts/check_contracts.ts --distribution stack --baseBranch 9.3
      `,
    },
  }
);
