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
  }
  return failures;
}

/**
 * Classifies each failure as "known skipped" when the test resolves to a skipped suite/test in
 * the file as it exists on `mainRef` but not on `baseRef` (the PR's merge base). Skips already
 * present at the merge base are not new to the PR, so removing them in the PR keeps the failure.
 */
export function evaluateFailures(
  failures: EvaluableFailure[],
  { mainRef, baseRef, readFile }: { mainRef: string; baseRef: string; readFile: RefFileReader }
): SkippedOnMainEvaluation {
  const trees: Record<string, SuiteNode[] | undefined> = {};
  const getTree = (ref: string, file: string) => {
    const key = `${ref}:${file}`;
    if (!(key in trees)) {
      const source = readFile(ref, file);
      trees[key] = source === undefined ? undefined : parseSuiteTree(source, file);
    }
    return trees[key];
  };

  const findSkip = (tree: SuiteNode[] | undefined, failure: EvaluableFailure) => {
    if (!tree) {
      return undefined;
    }
    return failure.kind === 'ftr'
      ? findSkipForFullTitle(tree, failure.fullTitle)
      : findSkipForScoutFailure(tree, failure.suite, failure.title);
  };

  const evaluation: SkippedOnMainEvaluation = { knownSkipped: [], real: [] };
  for (const failure of failures) {
    if (!failure.file) {
      evaluation.real.push(failure);
      continue;
    }
    const skipOnMain = findSkip(getTree(mainRef, failure.file), failure);
    const skipAtBase = findSkip(getTree(baseRef, failure.file), failure);
    if (skipOnMain && !skipAtBase) {
      evaluation.knownSkipped.push({ failure, issue: skipOnMain.issue });
    } else {
      evaluation.real.push(failure);
    }
  }
  return evaluation;
}
