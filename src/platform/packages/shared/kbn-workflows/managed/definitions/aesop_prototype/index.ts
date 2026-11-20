/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AESOP_AB_COMPARE_YAML from './aesop_ab_compare.yaml';
import AESOP_DRIFT_MONITOR_YAML from './aesop_drift_monitor.yaml';
import AESOP_EXPLORER_YAML from './aesop_explorer.yaml';
import AESOP_REFINE_YAML from './aesop_refine.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const AESOP_AB_COMPARE_WORKFLOW_ID = 'system-security-aesop-ab-compare';

export const AESOP_DRIFT_MONITOR_WORKFLOW_ID = 'system-security-aesop-drift-monitor';

export const AESOP_EXPLORER_WORKFLOW_ID = 'system-security-aesop-explorer';

export const AESOP_REFINE_WORKFLOW_ID = 'system-security-aesop-refine';

/** AESOP prototype: A/B up to three skill variants against a no-skill baseline and deploy the winner on approval. */
export const AESOP_AB_COMPARE_WORKFLOW = {
  id: AESOP_AB_COMPARE_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 17,
  billable: false,
  yaml: AESOP_AB_COMPARE_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;

/** AESOP prototype: rewrite the best A/B variant from its failed examples, scoring each rewrite in an evaluate-only A/B. */
export const AESOP_REFINE_WORKFLOW = {
  id: AESOP_REFINE_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 4,
  billable: false,
  yaml: AESOP_REFINE_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;

export interface AesopDriftMonitorWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  /** The skill whose deployed traffic the monitor grades. */
  skillId: string;
  /** The skill's display name; load_skill resolves by name, so traces are matched on it. */
  skillName: string;
  /** How often the monitor runs. */
  intervalMinutes: number;
  /** How far back each run looks for traces to grade. */
  lookbackMinutes: number;
  /** Mean online score below which the monitor proposes a rollback. */
  driftThreshold?: number;
  /** The investigation a rollback proposal is raised under; no proposal is raised without one. */
  investigationId?: string;
}

// The name is rendered raw into a single-quoted YAML const and double-quoted
// ES|QL literals, so anything outside this set falls back to the skill id.
// Agent Builder skill names are validated to a subset of it, so a real skill
// name never takes the fallback.
const SAFE_SKILL_NAME = /^[A-Za-z0-9 ._-]+$/;

// Ids are rendered into single-quoted YAML scalars that the workflow engine
// later evaluates as Liquid, so `{{`, `{%`, quotes and whitespace must never
// reach the template. The routes validate the same set; this re-check covers
// instances re-rendered from stored values.
const SAFE_TEMPLATE_ID = /^[A-Za-z0-9._:-]*$/;

const toTemplateId = (name: string, value: string): string => {
  if (!SAFE_TEMPLATE_ID.test(value)) {
    throw new Error(
      `${name} may only contain letters, digits, periods, underscores, colons and hyphens`
    );
  }
  return value;
};

// Instances stored before the threshold existed re-render with this value.
const DEFAULT_DRIFT_THRESHOLD = 0.8;

const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

/** AESOP prototype: per-skill online-evaluation monitor; enabling an instance schedules it. */
export const AESOP_DRIFT_MONITOR_WORKFLOW = {
  id: AESOP_DRIFT_MONITOR_WORKFLOW_ID,
  pluginId: 'securitySolution',
  // Bump on every YAML edit: yamlTemplate hashing does not see the imported
  // YAML, so installed instances only re-render on a version bump.
  version: 12,
  billable: false,
  // When the name is missing (instances stored before skillName existed, or an
  // enable that could not resolve it) the monitor matches on the id, so it only
  // finds traces when name equals id. Re-enabling stores the current name.
  yamlTemplate: ({
    skillId,
    skillName,
    intervalMinutes,
    lookbackMinutes,
    driftThreshold,
    investigationId,
  }) =>
    renderTemplate(AESOP_DRIFT_MONITOR_YAML, {
      __SKILL_ID__: toTemplateId('skillId', skillId),
      // Instances stored before skillName existed re-render without it.
      __SKILL_NAME__: skillName && SAFE_SKILL_NAME.test(skillName) ? skillName : skillId,
      __INTERVAL_MINUTES__: intervalMinutes,
      __LOOKBACK_MINUTES__: lookbackMinutes,
      __DRIFT_THRESHOLD__: Number.isFinite(driftThreshold)
        ? Number(driftThreshold)
        : DEFAULT_DRIFT_THRESHOLD,
      __INVESTIGATION_ID__: toTemplateId('investigationId', investigationId ?? ''),
    }),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<AesopDriftMonitorWorkflowTemplateValues>;

export type AesopExplorerMode = 'discovery' | 'telemetry';

export interface AesopExplorerWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  /** `discovery` proposes new skills from security data; `telemetry` proposes variants of existing skills. */
  mode: AesopExplorerMode;
  /** How often the explorer runs. */
  intervalMinutes: number;
  /** Model connector the explorer agent and every A/B arm run through. */
  connectorId: string;
  /** Evals dataset an A/B arm runs against when the candidate names no fitting dataset. */
  datasetId: string;
  /** Agent the A/B arms converse with. */
  abAgentId: string;
  /** Investigation the A/B proposals are recorded on. */
  investigationId: string;
}

/** AESOP prototype: per-space explorer that proposes skill candidates to the A/B compare; enabling an instance schedules it. */
export const AESOP_EXPLORER_WORKFLOW = {
  id: AESOP_EXPLORER_WORKFLOW_ID,
  pluginId: 'securitySolution',
  // Bump on every YAML edit: yamlTemplate hashing does not see the imported
  // YAML, so installed instances only re-render on a version bump.
  version: 13,
  billable: false,
  yamlTemplate: ({ mode, intervalMinutes, connectorId, datasetId, abAgentId, investigationId }) =>
    renderTemplate(AESOP_EXPLORER_YAML, {
      __MODE__: mode === 'telemetry' ? 'telemetry' : 'discovery',
      __INTERVAL_MINUTES__: intervalMinutes,
      __CONNECTOR_ID__: toTemplateId('connectorId', connectorId),
      // The default when a candidate names no dataset that fits its task;
      // the explorer reads the full dataset list at runtime.
      __DATASET_ID__: toTemplateId('datasetId', datasetId),
      __AB_AGENT_ID__: toTemplateId('abAgentId', abAgentId),
      __INVESTIGATION_ID__: toTemplateId('investigationId', investigationId),
    }),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<AesopExplorerWorkflowTemplateValues>;
