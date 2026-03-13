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
  serverConfigSet?: string;
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

function normalizeEvaluationConnectorId(raw: string): string {
  // Support `models:judge:eis/<modelId>` where the judge value is a model id, not a connector id.
  if (raw.startsWith('eis/')) {
    return `eis-${normalizeBuildkiteKey(raw.slice('eis/'.length))}`;
  }

  // Support `models:judge:<modelGroup>` (e.g. `llm-gateway/gpt-5.2`) where the judge value is a model group.
  if (raw.includes('/')) {
    return `litellm-${normalizeBuildkiteKey(raw)}`;
  }

  // Already a connector id (e.g. `litellm-*` / `eis-*`) or some other explicit id.
  return raw;
}

function buildEvalsYaml({
  selectedSuites,
  modelGroups,
  evaluationConnectorId,
  includeEisModels,
}: {
  selectedSuites: EvalsSuiteMetadataEntry[];
  modelGroups: string[] | undefined;
  evaluationConnectorId: string | undefined;
  includeEisModels: boolean;
}): string {
  const suiteSteps = selectedSuites
    .map((suite) => {
      const key = `kbn-evals-${normalizeBuildkiteKey(suite.id)}`;
      const label = suite.name ? `Evals: ${suite.name}` : `Evals: ${suite.id}`;
      const modelGroupsEnv =
        modelGroups && modelGroups.length > 0
          ? `          EVAL_MODEL_GROUPS: '${modelGroups.join(',')}'`
          : null;
      const evaluationConnectorIdEnv = evaluationConnectorId
        ? `          EVALUATION_CONNECTOR_ID: '${evaluationConnectorId}'`
        : null;
      const includeEisModelsEnv = includeEisModels
        ? `          EVAL_INCLUDE_EIS_MODELS: '1'`
        : null;
      const evalServerConfigSetEnv = suite.serverConfigSet
        ? `          EVAL_SERVER_CONFIG_SET: '${suite.serverConfigSet}'`
        : null;
      return [
        `      - label: '${label}'`,
        `        key: ${key}`,
        `        command: bash .buildkite/scripts/steps/evals/run_suite.sh`,
        `        env:`,
        `          KBN_EVALS: '1'`,
        `          FTR_EIS_CCM: '1'`,
        `          EVAL_SUITE_ID: '${suite.id}'`,
        `          EVAL_FANOUT: '1'`,
        ...(evaluationConnectorIdEnv ? [evaluationConnectorIdEnv] : []),
        ...(includeEisModelsEnv ? [includeEisModelsEnv] : []),
        ...(modelGroupsEnv ? [modelGroupsEnv] : []),
        ...(evalServerConfigSetEnv ? [evalServerConfigSetEnv] : []),
        `        timeout_in_minutes: 60`,
        `        agents:`,
        `          image: family/kibana-ubuntu-2404`,
        `          imageProject: elastic-images-prod`,
        `          provider: gcp`,
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
    `    steps:`,
    suiteSteps,
  ].join('\n');
}

/**
 * Reads evals suite metadata and PR labels, then returns a Buildkite YAML group
 * for the matching eval suites.
 */
export function getEvalPipeline(githubPrLabels: string): string | null {
  const parsedLabels = parseGithubPrLabels(githubPrLabels);

  // Run eval suite(s) when their GH label(s) are present (see `evals.suites.json`).
  const evalSuites = readEvalsSuiteMetadata();
  const runAllEvals = parsedLabels.includes('evals:all');
  const selectedEvalSuites = runAllEvals
    ? evalSuites
    : evalSuites.filter((suite) => {
        const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
        return labels.some((label) => parsedLabels.includes(label));
      });
  // Optional model filtering for eval fanout (models:* labels).
  // - No `models:*` labels => run all models returned by LiteLLM (current behavior).
  // - One or more `models:<model-group>` labels => only run connectors whose `defaultModel`
  //   matches one of those model groups.
  // - `models:all` can be used to explicitly opt into all models (ignored if combined with specifics).
  const rawEvaluationConnectorId = parsedLabels
    .find((label) => label.startsWith('models:judge:'))
    ?.slice('models:judge:'.length)
    ?.trim();
  const evaluationConnectorId = rawEvaluationConnectorId
    ? normalizeEvaluationConnectorId(rawEvaluationConnectorId)
    : undefined;
  const includeEisModels =
    parsedLabels.some((label) => label === 'models:all' || label.startsWith('models:eis/')) ||
    !!rawEvaluationConnectorId?.startsWith('eis/') ||
    !!evaluationConnectorId?.startsWith('eis-');
  const selectedModelGroups = parsedLabels
    .filter((label) => label.startsWith('models:') && !label.startsWith('models:judge:'))
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
    evaluationConnectorId,
    includeEisModels,
  });
}
