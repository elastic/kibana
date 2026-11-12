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

/**
 * AESOP prototype (securitySolution): the A/B skill-compare loop as one
 * stored workflow — create a variant skill, run both arms through the evals
 * plugin with the five CODE evaluators plus the judge, compare the two
 * experiments, propose the deploy, and PUT the winning content onto the live
 * skill on approval.
 */
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

/**
 * AESOP prototype (securitySolution): online-evaluation monitor for one
 * deployed skill. Installed disabled and instantiated per skill; enabling an
 * instance is what registers its scheduled trigger.
 */
export const AESOP_DRIFT_MONITOR_WORKFLOW = {
  id: AESOP_DRIFT_MONITOR_WORKFLOW_ID,
  pluginId: 'securitySolution',
  // Version 2 wraps the trace match in KQL(). yamlTemplate hashing does not see
  // the imported YAML, so installed instances only re-render on a version bump.
  version: 2,
  billable: false,
  yamlTemplate: ({ skillId, intervalMinutes, lookbackMinutes }) =>
    renderTemplate(AESOP_DRIFT_MONITOR_YAML, {
      __SKILL_ID__: skillId,
      __INTERVAL_MINUTES__: intervalMinutes,
      __LOOKBACK_MINUTES__: lookbackMinutes,
    }),
  management: {
    lifecycle: 'dynamic',
    versionStrategy: 'auto',
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<AesopDriftMonitorWorkflowTemplateValues>;
