/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { minimatch } from 'minimatch';

// Reads the real config, like `evals_suites_config.test.ts` reads the real
// evals.suites.json: the file lives outside .buildkite's glob-able tree, so a
// PR-time check is the cheapest guard against breaking the label rules.
const labelerConfigPath = Path.join(__dirname, '..', '..', '..', '.github', 'paths-labeller.yml');
const labelerConfig = Fs.readFileSync(labelerConfigPath, 'utf-8');

// Parse the YAML without adding a YAML dependency to the .buildkite workspace:
// the config is a flat `- 'label':` / `    - 'glob':` list, so a line regex is
// sufficient and keeps the parse honest about the file's actual shape.
const LABEL_LINE = /^-\s+'([^']+)':\s*$/;
const GLOB_LINE = /^\s+-\s+'([^']+)':?\s*$/;

interface LabelRule {
  label: string;
  globs: string[];
}

const rules: LabelRule[] = [];
for (const line of labelerConfig.split('\n')) {
  const labelMatch = line.match(LABEL_LINE);
  if (labelMatch) {
    rules.push({ label: labelMatch[1], globs: [] });
    continue;
  }
  const globMatch = line.match(GLOB_LINE);
  if (globMatch && rules.length > 0) {
    rules[rules.length - 1].globs.push(globMatch[1]);
  }
}

// The evals CI gate is driven by these labels: botelastic applies them from this
// config when a PR opens, and the eval trigger pipeline (eval_pipeline.ts)
// reads the PR's labels to decide which eval suites run. The prbot
// `backport labels` / `release note labels` commit statuses then evaluate the
// remaining mandatory-label set (backport:*, release_note:*) on the same PR.
const EVALS_GLOB_RULES = rules.filter((rule) => rule.globs.some((glob) => glob.includes('evals')));

// Representative paths from the evals CI surface: the weekly pipeline YAML the
// evals labels gate on, plus the eval step scripts and the eval registry.
const EVALS_PATHS = [
  '.buildkite/pipelines/evals/llm_evals.yml',
  '.buildkite/pipelines/evals/on_demand_evals.yml',
  '.buildkite/pipelines/evals/evals.suites.json',
  '.buildkite/scripts/steps/evals/run_suite.sh',
];

// GitHub's paths filter treats leading-dot directories as hidden unless the
// glob opts in, so assert against both settings.
const MATCH_OPTIONS = [{ dot: true }, { dot: false }];

describe('.github/paths-labeller.yml evals rules', () => {
  it('parses into label rules with at least one glob each', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.label).toMatch(/\S/);
      expect(rule.globs.length).toBeGreaterThan(0);
    }
  });

  it('has an evals rule whose globs match every file that drives the evals CI gate', () => {
    const problems: string[] = [];

    if (EVALS_GLOB_RULES.length === 0) {
      problems.push('no label rule references the evals CI paths');
    }

    for (const evalsPath of EVALS_PATHS) {
      const matching = EVALS_GLOB_RULES.filter((rule) =>
        rule.globs.some((glob) =>
          MATCH_OPTIONS.some((options) => minimatch(evalsPath, glob, options))
        )
      );
      if (matching.length === 0) {
        problems.push(`no evals label glob matches "${evalsPath}"`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('has an evals rule that applies a label, not just matches paths', () => {
    // A rule whose label is removed from this config silently stops gating eval
    // runs on PRs; assert the evals labels exist by name so the failure names
    // the contract, not just the glob mechanics.
    const labels = EVALS_GLOB_RULES.map((rule) => rule.label);
    expect(labels).toContain('evals:smoke-tests');
  });
});
