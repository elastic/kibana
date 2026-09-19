/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawnSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

import { getLocationFromClassname } from '../get_failures';
import { makeFailedTestCaseIter, readTestReport } from '../test_report';
import type { SkipLookup, SuiteNode } from './skip_tree';
import { findSkipForFullTitle, findSkipForScoutFailure, parseSuiteTree } from './skip_tree';

export type EvaluableFailure =
  | { kind: 'ftr'; file: string; fullTitle: string }
  | { kind: 'scout'; file: string; suite: string; title: string };

export interface KnownSkippedFailure {
  failure: EvaluableFailure;
  issue?: string;
}

export interface SkippedOnMainEvaluation {
  knownSkipped: KnownSkippedFailure[];
  real: EvaluableFailure[];
}

/** Returns the file content at `ref`, or undefined when the path does not exist there. */
export type RefFileReader = (ref: string, file: string) => string | undefined;

export const readFileFromGit: RefFileReader = (ref, file) => {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return undefined;
  }
};

export async function collectJUnitFailures(xmlPaths: string[]): Promise<EvaluableFailure[]> {
  const failures: EvaluableFailure[] = [];
  for (const xmlPath of xmlPaths) {
    const report = await readTestReport(xmlPath);
    for (const testCase of makeFailedTestCaseIter(report)) {
      failures.push({
        kind: 'ftr',
        file: getLocationFromClassname(testCase.$.classname.trim()),
        fullTitle: testCase.$.name.trim(),
      });
    }
  }
  return failures;
}

const SCOUT_FAILURES_FILE_RE = /^scout-failures-(.*)\.ndjson$/;

/**
 * Runner-level errors (global setup/teardown, config, run timeout) are written by the reporter
 * to `scout-runner-errors-<runId>.json` next to `scout-failures-<runId>.ndjson`, as the last
 * step of its `onEnd`. A missing sidecar therefore means the reporter did not finish, and the
 * NDJSON cannot be trusted to explain the run's exit code.
 */
const readScoutRunnerErrors = (ndjsonPath: string): string[] => {
  const runId = Path.basename(ndjsonPath).match(SCOUT_FAILURES_FILE_RE)?.[1];
  if (runId === undefined) {
    return [`unrecognised failure report name: ${Path.basename(ndjsonPath)}`];
  }
  const runnerErrorsPath = Path.join(Path.dirname(ndjsonPath), `scout-runner-errors-${runId}.json`);
  if (!Fs.existsSync(runnerErrorsPath)) {
    return [`runner errors sidecar missing (reporter did not complete): ${runnerErrorsPath}`];
  }
  const { errors } = JSON.parse(Fs.readFileSync(runnerErrorsPath, 'utf8')) as { errors: string[] };
  return errors;
};

/**
 * Reads Scout failures from `scout-failures-<runId>.ndjson` plus the sibling runner errors.
 * Runner errors have no test file, so they always evaluate as real and prevent the run from
 * being forgiven on the strength of its test failures alone.
 */
export function collectScoutFailures(ndjsonPaths: string[]): EvaluableFailure[] {
  const failures: EvaluableFailure[] = [];
  for (const ndjsonPath of ndjsonPaths) {
    for (const line of Fs.readFileSync(ndjsonPath, 'utf8').split('\n')) {
      if (!line.trim()) {
        continue;
      }
      const entry = JSON.parse(line) as { suite: string; title: string; location: string };
      failures.push({
        kind: 'scout',
        file: entry.location,
        suite: entry.suite,
        title: entry.title,
      });
    }
    for (const message of readScoutRunnerErrors(ndjsonPath)) {
      failures.push({ kind: 'scout', file: '', suite: 'Scout runner', title: message });
    }
  }
  return failures;
}

/**
 * Three-way merges the PR head version of a file (`ours`) with the target branch version
 * (`theirs`) over their common ancestor `base`, exactly as a rebase would. Returns undefined when
 * the merge conflicts or `git merge-file` fails.
 */
export const mergeFileContents = (
  base: string,
  ours: string,
  theirs: string
): string | undefined => {
  const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'skipped-on-main-merge-'));
  try {
    const write = (name: string, content: string) => {
      const path = Path.join(dir, name);
      Fs.writeFileSync(path, content);
      return path;
    };
    const oursPath = write('ours', ours);
    const basePath = write('base', base);
    const theirsPath = write('theirs', theirs);
    // exit status is the number of conflicts, or 255 on error
    const result = spawnSync('git', ['merge-file', '-p', oursPath, basePath, theirsPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return result.status === 0 ? result.stdout : undefined;
  } finally {
    Fs.rmSync(dir, { recursive: true, force: true });
  }
};

export interface EvaluateOptions {
  /** Target branch tip (e.g. FETCH_HEAD after fetching main). */
  mainRef: string;
  /** Merge base of the PR and the target branch. */
  baseRef: string;
  /** The PR head the failing run was executed against. */
  headRef: string;
  readFile: RefFileReader;
}

/**
 * Classifies each failure as "known skipped" when the test would not run had the PR been rebased
 * onto `mainRef`: the failing file is three-way merged (`baseRef` -> `headRef` vs `mainRef`) and
 * the test must resolve to a skipped suite/test in the merged file. Everything the merge cannot
 * settle keeps the failure real: a file missing at any of the three refs, a conflicting merge (the
 * PR and `mainRef` touched the same lines), or a same-titled test the PR added or un-skipped,
 * which survives the merge runnable next to the skipped one.
 *
 * As a guard against misreading the file, the failed test must also resolve as runnable at
 * `headRef`: it ran there, so a lookup that finds it skipped or unresolvable cannot be trusted.
 */
export function evaluateFailures(
  failures: EvaluableFailure[],
  { mainRef, baseRef, headRef, readFile }: EvaluateOptions
): SkippedOnMainEvaluation {
  interface FileTrees {
    head: SuiteNode[];
    merged: SuiteNode[];
  }
  const trees = new Map<string, FileTrees | undefined>();
  const getTrees = (file: string): FileTrees | undefined => {
    if (trees.has(file)) {
      return trees.get(file);
    }
    let result: FileTrees | undefined;
    const head = readFile(headRef, file);
    const base = head === undefined ? undefined : readFile(baseRef, file);
    const main = base === undefined ? undefined : readFile(mainRef, file);
    if (head !== undefined && base !== undefined && main !== undefined) {
      const merged = mergeFileContents(base, head, main);
      if (merged !== undefined) {
        result = { head: parseSuiteTree(head, file), merged: parseSuiteTree(merged, file) };
      }
    }
    trees.set(file, result);
    return result;
  };

  const findSkip = (tree: SuiteNode[], failure: EvaluableFailure): SkipLookup =>
    failure.kind === 'ftr'
      ? findSkipForFullTitle(tree, failure.fullTitle)
      : findSkipForScoutFailure(tree, failure.suite, failure.title, failure.file);

  /** The skip that would cover `failure` after rebasing the PR onto `mainRef`, if any. */
  const findSkipAfterRebase = (failure: EvaluableFailure): SuiteNode | undefined => {
    if (!failure.file) {
      return undefined;
    }
    const fileTrees = getTrees(failure.file);
    if (!fileTrees || !findSkip(fileTrees.head, failure).allUnskipped) {
      return undefined;
    }
    return findSkip(fileTrees.merged, failure).skip;
  };

  const evaluation: SkippedOnMainEvaluation = { knownSkipped: [], real: [] };
  for (const failure of failures) {
    const skip = findSkipAfterRebase(failure);
    if (skip) {
      evaluation.knownSkipped.push({ failure, issue: skip.issue });
    } else {
      evaluation.real.push(failure);
    }
  }
  return evaluation;
}
