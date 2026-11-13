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
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const AESOP_AB_COMPARE_WORKFLOW_ID = 'system-security-aesop-ab-compare';

export const AESOP_DRIFT_MONITOR_WORKFLOW_ID = 'system-security-aesop-drift-monitor';

/** AESOP prototype: A/B a skill variant through evals and deploy it on approval. */
export const AESOP_AB_COMPARE_WORKFLOW = {
  id: AESOP_AB_COMPARE_WORKFLOW_ID,
  pluginId: 'securitySolution',
  version: 1,
  billable: false,
  yaml: AESOP_AB_COMPARE_YAML,
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
}

// The name is rendered raw into a single-quoted YAML const and double-quoted
// ES|QL literals, so anything outside this set falls back to the skill id.
// Agent Builder skill names are validated to a subset of it, so a real skill
// name never takes the fallback.
const SAFE_SKILL_NAME = /^[A-Za-z0-9 ._-]+$/;

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
  version: 7,
  billable: false,
  // When the name is missing (instances stored before skillName existed, or an
  // enable that could not resolve it) the monitor matches on the id, so it only
  // finds traces when name equals id. Re-enabling stores the current name.
  yamlTemplate: ({ skillId, skillName, intervalMinutes, lookbackMinutes }) =>
    renderTemplate(AESOP_DRIFT_MONITOR_YAML, {
      __SKILL_ID__: skillId,
      // Instances stored before skillName existed re-render without it.
      __SKILL_NAME__: skillName && SAFE_SKILL_NAME.test(skillName) ? skillName : skillId,
      __INTERVAL_MINUTES__: intervalMinutes,
      __LOOKBACK_MINUTES__: lookbackMinutes,
    }),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<AesopDriftMonitorWorkflowTemplateValues>;
