/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FEEDBACK_ANALYSIS_YAML from './feedback_analysis.yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from '../../types';

export const CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID =
  'system-context-engine-feedback-analysis';

export interface ContextEngineFeedbackAnalysisWorkflowTemplateValues
  extends ManagedWorkflowTemplateValues {
  /** The AI index this instance analyzes. One installed workflow per index. */
  aiIndexId: string;
  /** How often it runs. A scheduled trigger's interval is fixed at install time. */
  intervalMinutes: number;
}

/**
 * `dynamic` because there is one instance per AI index, installed when analysis is turned on and
 * uninstalled when it is turned off.
 *
 * `enforced` because whether the analysis runs is already stored on the AI index, as
 * `feedback_analysis.enabled`. Making the workflow document's own flag independently settable
 * would create a second answer to the same question, and the two would drift the first time
 * someone paused the workflow instead of the index. Pausing is a change to the index's
 * configuration, which uninstalls the instance.
 */
const CONTEXT_ENGINE_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'enforced',
} as const;

// Exact-token replacement, because both values are needed before the workflow runs: a scheduled
// trigger's interval and a concurrency key are read at install time and are not reachable by the
// engine's own `${{ }}` / `{{ }}` runtime templating.
const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

export const CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW = {
  id: CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 1,
  billable: false,
  yamlTemplate: ({ aiIndexId, intervalMinutes }) =>
    renderTemplate(FEEDBACK_ANALYSIS_YAML, {
      __AI_INDEX_ID__: aiIndexId,
      __INTERVAL_MINUTES__: intervalMinutes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineFeedbackAnalysisWorkflowTemplateValues>;
