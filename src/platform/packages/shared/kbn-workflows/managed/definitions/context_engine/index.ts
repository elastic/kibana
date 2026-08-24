/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import IMPROVEMENT_LOOP_YAML from './improvement_loop.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID = 'system-context-engine-improvement-loop';

export interface ContextEngineImprovementLoopWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The AI index this instance analyzes. One instance is installed per index. */
  aiIndexId: string;
  /** How often the scheduled trigger fires. */
  intervalMinutes: number;
  /**
   * Version of the internal Context Engine API the `kibana.request` steps call. Passed in by
   * the plugin rather than hardcoded here, so the workflow cannot drift from the routes it
   * calls (this package cannot import from the plugin).
   */
  apiVersion: string;
}

// The AI index id, the cadence, and the API version are all needed to *render* the workflow —
// the id appears in the request paths and the concurrency key, and neither a trigger interval
// nor a header can be expressed with the engine's own runtime templating. So they are
// substituted at install time by exact-token replacement.
const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

export const CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW = {
  id: CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 1,
  billable: false,
  yamlTemplate: ({ aiIndexId, intervalMinutes, apiVersion }) =>
    renderTemplate(IMPROVEMENT_LOOP_YAML, {
      __AI_INDEX_ID__: aiIndexId,
      __INTERVAL_MINUTES__: intervalMinutes,
      __API_VERSION__: apiVersion,
    }),
  management: {
    // One instance per AI index, created and removed with the index rather than on boot.
    lifecycle: 'dynamic',
    // Existing instances are re-rendered from this definition on startup, so a fix here reaches
    // indices whose owners will never think to toggle their schedule off and on again. Any
    // template value added later therefore needs a default: startup re-renders from the values
    // persisted at install time, which will not have it.
    versionStrategy: 'auto',
    // Whether the schedule is on is the user's decision, so a re-render must preserve it.
    enablement: 'restorable',
  },
} as const satisfies ManagedWorkflowDefinition<ContextEngineImprovementLoopWorkflowTemplateValues>;
