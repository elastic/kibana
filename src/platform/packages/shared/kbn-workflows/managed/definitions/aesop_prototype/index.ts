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
  /** The skill's display name; agents usually load skills by name, so traces match on either. */
  skillName: string;
  /** How often the monitor runs. */
  intervalMinutes: number;
  /** How far back each run looks for traces to grade. */
  lookbackMinutes: number;
}

const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

/** AESOP prototype: per-skill online-evaluation monitor; enabling an instance schedules it. */
export const AESOP_DRIFT_MONITOR_WORKFLOW = {
  id: AESOP_DRIFT_MONITOR_WORKFLOW_ID,
  pluginId: 'securitySolution',
  // Version 4 matches traces by the skill's name as well as its id, and
  // reports traces_graded as the traces actually graded. yamlTemplate
  // hashing does not see the imported YAML, so installed instances only
  // re-render on a version bump.
  version: 4,
  billable: false,
  yamlTemplate: ({ skillId, skillName, intervalMinutes, lookbackMinutes }) =>
    renderTemplate(AESOP_DRIFT_MONITOR_YAML, {
      __SKILL_ID__: skillId,
      __SKILL_NAME__: skillName,
      __INTERVAL_MINUTES__: intervalMinutes,
      __LOOKBACK_MINUTES__: lookbackMinutes,
    }),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<AesopDriftMonitorWorkflowTemplateValues>;
