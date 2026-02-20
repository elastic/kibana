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

const EVALS_SUITES_METADATA_RELATIVE_PATH =
  'x-pack/platform/packages/shared/kbn-evals/evals.suites.json';

export interface EvalsSuiteMetadataEntry {
  id: string;
  name?: string;
  ciLabels?: string[];
  configPath?: string;
}

function readEvalsSuiteMetadata(): EvalsSuiteMetadataEntry[] {
  try {
    const filePath = Path.resolve(process.cwd(), EVALS_SUITES_METADATA_RELATIVE_PATH);
    const raw = Fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { suites?: EvalsSuiteMetadataEntry[] };
    const suites = Array.isArray(parsed.suites) ? parsed.suites : [];
    return suites.filter((suite) => {
      if (!suite?.configPath) return true;
      try {
        return Fs.existsSync(Path.resolve(process.cwd(), suite.configPath));
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function normalizeBuildkiteKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseGithubPrLabels(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map(String)
        .map((label) => label.trim())
        .filter(Boolean);
    }
  } catch {
    // fall through
  }

  return raw
    .split(/[\n,]+/g)
    .map((label) => label.trim())
    .filter(Boolean);
}

function buildEvalsYaml({
  selectedSuites,
  modelGroups,
}: {
  selectedSuites: EvalsSuiteMetadataEntry[];
  modelGroups: string[] | undefined;
}): string {
  const suiteSteps = selectedSuites
    .map((suite) => {
      const key = `kbn-evals-${normalizeBuildkiteKey(suite.id)}`;
      const label = suite.name ? `Evals: ${suite.name}` : `Evals: ${suite.id}`;
      const modelGroupsEnv =
        modelGroups && modelGroups.length > 0
          ? `          EVAL_MODEL_GROUPS: '${modelGroups.join(',')}'`
          : null;
      return [
        `      - label: '${label}'`,
        `        key: ${key}`,
        `        command: bash .buildkite/scripts/steps/evals/run_suite.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          EVAL_SUITE_ID: '${suite.id}'`,
        `          EVAL_FANOUT: '1'`,
        ...(modelGroupsEnv ? [modelGroupsEnv] : []),
        `        timeout_in_minutes: 60`,
        `        agents:`,
        `          machineType: n2-standard-8`,
        `          preemptible: true`,
        `        retry:`,
        `          automatic:`,
        `            - exit_status: '-1'`,
        `              limit: 3`,
        `            - exit_status: '*'`,
        `              limit: 1`,
      ].join('\n');
    })
    .join('\n');

  return [
    // NOTE: `getPipeline()` strips `steps:` from YAML fragments so they can be concatenated
    // under the single top-level `steps:` key. This must follow that convention.
    `  - group: LLM Evals`,
    `    key: kibana-evals`,
    `    depends_on:`,
    `      - build`,
    `      - quick_checks`,
    `      - checks`,
    `      - linting`,
    `      - linting_with_types`,
    `      - check_oas_snapshot`,
    `      - check_types`,
    `    steps:`,
    suiteSteps,
  ].join('\n');
}

/**
 * Reads evals suite metadata and PR labels, then returns a Buildkite YAML group
 * for the matching eval suites.
 */
export function getEvalPipeline(githubPrLabels: string): string | null {
  // Run eval suite(s) when their GH label(s) are present (see `evals.suites.json`).
  const evalSuites = readEvalsSuiteMetadata();
  const runAllEvals = githubPrLabels.includes('evals:all');
  const selectedEvalSuites = runAllEvals
    ? evalSuites
    : evalSuites.filter((suite) => {
        const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
        return labels.some((label) => githubPrLabels.includes(label));
      });
  // Optional model filtering for eval fanout (models:* labels).
  // - No `models:*` labels => run all models returned by LiteLLM (current behavior).
  // - One or more `models:<model-group>` labels => only run connectors whose `defaultModel`
  //   matches one of those model groups.
  // - `models:all` can be used to explicitly opt into all models (ignored if combined with specifics).
  const parsedLabels = parseGithubPrLabels(githubPrLabels);
  const selectedModelGroups = parsedLabels
    .filter((label) => label.startsWith('models:'))
    .map((label) => label.slice('models:'.length))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== 'all');

  if (selectedEvalSuites.length === 0) {
    return null;
  }

  return buildEvalsYaml({
    selectedSuites: selectedEvalSuites,
    modelGroups: selectedModelGroups.length > 0 ? selectedModelGroups : undefined,
  });
}
