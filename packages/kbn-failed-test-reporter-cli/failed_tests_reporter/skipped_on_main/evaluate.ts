/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

import { getLocationFromClassname } from '../get_failures';
import { makeFailedTestCaseIter, readTestReport } from '../test_report';
import type { SuiteNode } from './skip_tree';
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
 * to `scout-runner-errors-<runId>.json` next to `scout-failures-<runId>.ndjson`.
 */
const readScoutRunnerErrors = (ndjsonPath: string): string[] => {
  const runId = Path.basename(ndjsonPath).match(SCOUT_FAILURES_FILE_RE)?.[1];
  if (runId === undefined) {
    return [];
  }
  const runnerErrorsPath = Path.join(Path.dirname(ndjsonPath), `scout-runner-errors-${runId}.json`);
  if (!Fs.existsSync(runnerErrorsPath)) {
    return [];
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
 * Classifies each failure as "known skipped" when the test resolves to a skipped suite/test in
 * the file as it exists on `mainRef` but not on `baseRef` (the PR's merge base). Skips already
 * present at the merge base are not new to the PR, so removing them in the PR keeps the failure.
 * A file absent at the merge base was added by the PR itself, so a skip on `mainRef` comes from an
 * independent add of the same path; rebasing would conflict rather than apply it, so the failure
 * stays real.
 */
export function evaluateFailures(
  failures: EvaluableFailure[],
  { mainRef, baseRef, readFile }: { mainRef: string; baseRef: string; readFile: RefFileReader }
): SkippedOnMainEvaluation {
  const trees = new Map<string, SuiteNode[] | undefined>();
  const getTree = (ref: string, file: string): SuiteNode[] | undefined => {
    const key = `${ref}:${file}`;
    if (!trees.has(key)) {
      const source = readFile(ref, file);
      trees.set(key, source === undefined ? undefined : parseSuiteTree(source, file));
    }
    return trees.get(key);
  };

  const findSkip = (tree: SuiteNode[], failure: EvaluableFailure): SuiteNode | undefined =>
    failure.kind === 'ftr'
      ? findSkipForFullTitle(tree, failure.fullTitle)
      : findSkipForScoutFailure(tree, failure.suite, failure.title, failure.file);

  /** The skip on `mainRef` that explains `failure`, if it is absent at `baseRef`. */
  const findNewSkipOnMain = (failure: EvaluableFailure): SuiteNode | undefined => {
    if (!failure.file) {
      return undefined;
    }
    const mainTree = getTree(mainRef, failure.file);
    const baseTree = getTree(baseRef, failure.file);
    if (!mainTree || !baseTree) {
      return undefined;
    }
    const skipOnMain = findSkip(mainTree, failure);
    if (!skipOnMain || findSkip(baseTree, failure)) {
      return undefined;
    }
    return skipOnMain;
  };

  const evaluation: SkippedOnMainEvaluation = { knownSkipped: [], real: [] };
  for (const failure of failures) {
    const skip = findNewSkipOnMain(failure);
    if (skip) {
      evaluation.knownSkipped.push({ failure, issue: skip.issue });
    } else {
      evaluation.real.push(failure);
    }
  }
  return evaluation;
}
