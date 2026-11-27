/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { runOasdiff } from '@kbn/api-contracts';
import { run } from '@kbn/dev-cli-runner';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  STEP_CONTRACTS_ALLOWLIST_PATH,
  STEP_CONTRACTS_APPROVED_STEPS_PATH,
  STEP_CONTRACTS_DIR,
} from './constants';
import {
  readFileFromGit,
  readStepContractsFromDir,
  readStepContractsFromGit,
} from './step_contracts';
import {
  compareStepContracts,
  formatStepContractsReport,
  getAddedAllowlistEntries,
  parseApprovedSteps,
  parseStepContractsAllowlist,
  type OpenApiDiffRunner,
  type StepContractsAllowlistEntry,
} from './step_contracts_compat';

const DOCS_LINK =
  'https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/workflows_extensions/dev_docs/STEPS.md#step-contract-check';

const runOasdiffOnDocuments: OpenApiDiffRunner = (base, head) => {
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'workflow-step-contracts-'));
  try {
    const basePath = Path.join(dir, 'base.json');
    const headPath = Path.join(dir, 'head.json');
    Fs.writeFileSync(basePath, JSON.stringify(base));
    Fs.writeFileSync(headPath, JSON.stringify(head));
    return runOasdiff(basePath, headPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw createFailError(
        'oasdiff is required to compare changed step contracts. Install it (`brew install oasdiff`) or set OASDIFF_BIN.'
      );
    }
    throw error;
  } finally {
    Fs.rmSync(dir, { recursive: true, force: true });
  }
};

const readAllowlist = (
  content: string | undefined,
  source: string
): StepContractsAllowlistEntry[] =>
  content === undefined ? [] : parseStepContractsAllowlist(JSON.parse(content), source);

const readWorkingTreeFile = (path: string): string | undefined => {
  const absolutePath = Path.join(REPO_ROOT, path);
  return Fs.existsSync(absolutePath) ? Fs.readFileSync(absolutePath, 'utf8') : undefined;
};

const readApprovedSteps = (): string[] => {
  const content = readWorkingTreeFile(STEP_CONTRACTS_APPROVED_STEPS_PATH);
  return content === undefined
    ? []
    : parseApprovedSteps(JSON.parse(content), STEP_CONTRACTS_APPROVED_STEPS_PATH);
};

/**
 * Compares the committed step contracts of the working tree with the ones at `--base`. Fails on
 * steps workflows-eng hasn't approved, and on breaking changes that the allowlist entries added
 * since `--base` don't accept.
 */
export const runCheckStepContracts = (): Promise<void> =>
  run(
    async ({ log, flags }) => {
      const base = typeof flags.base === 'string' ? flags.base : '';
      if (!base) {
        throw createFlagError('--base is required, such as the merge base of the branch');
      }

      const comparison = compareStepContracts({
        base: readStepContractsFromGit({ ref: base, dir: STEP_CONTRACTS_DIR, repoRoot: REPO_ROOT }),
        head: readStepContractsFromDir(Path.join(REPO_ROOT, STEP_CONTRACTS_DIR)),
        approvedSteps: readApprovedSteps(),
        allowlist: getAddedAllowlistEntries(
          readAllowlist(
            readFileFromGit({
              ref: base,
              path: STEP_CONTRACTS_ALLOWLIST_PATH,
              repoRoot: REPO_ROOT,
            }),
            `${base}:${STEP_CONTRACTS_ALLOWLIST_PATH}`
          ),
          readAllowlist(
            readWorkingTreeFile(STEP_CONTRACTS_ALLOWLIST_PATH),
            STEP_CONTRACTS_ALLOWLIST_PATH
          )
        ),
        runOpenApiDiff: runOasdiffOnDocuments,
      });

      const report = formatStepContractsReport(comparison, {
        approvedStepsPath: STEP_CONTRACTS_APPROVED_STEPS_PATH,
        allowlistPath: STEP_CONTRACTS_ALLOWLIST_PATH,
        docsLink: DOCS_LINK,
      });
      log.write(report);
      // Only written when there is something to report, so CI annotates the build only then.
      const hasFindings =
        comparison.changes.length > 0 ||
        comparison.addedSteps.length > 0 ||
        comparison.unapprovedSteps.length > 0;
      if (typeof flags.report === 'string' && flags.report && hasFindings) {
        Fs.writeFileSync(flags.report, `${report}\n`);
      }

      const blocking = comparison.changes.filter(({ disposition }) => disposition === 'blocking');
      const problems = [
        ...(comparison.unapprovedSteps.length > 0
          ? [`${comparison.unapprovedSteps.length} step(s) that workflows-eng hasn't approved`]
          : []),
        ...(blocking.length > 0
          ? [`${blocking.length} breaking change(s) to workflow step contracts since ${base}`]
          : []),
      ];
      if (problems.length > 0) {
        throw createFailError(`Found ${problems.join(' and ')}.`);
      }
    },
    {
      description:
        'Checks that workflows-eng approved every custom step, and that the committed step contracts have no breaking changes since a base commit.',
      flags: {
        string: ['base', 'report'],
        help: `
          --base             Commit to compare with, such as the merge base of the branch (required)
          --report           File to write the Markdown report to, when there are changes or new steps
        `,
      },
    }
  );
