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
  /** The AI index this instance analyzes. */
  aiIndexId: string;
  /** How often the workflow runs. */
  intervalMinutes: number;
}

// `restorable` rather than `enforced`: an instance is enabled after install, by the request of
// whoever turned analysis on, and that enablement is what holds its Task Manager trigger. Enforced
// enablement reapplies the template's `enabled` on every managed update, which would unschedule a
// running instance the next time this definition ships a new version.
const CONTEXT_ENGINE_WORKFLOW_MANAGEMENT = {
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
  enablement: 'restorable',
} as const;

const renderTemplate = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (yaml, [token, value]) => yaml.split(token).join(String(value)),
    template
  );

export const CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW = {
  id: CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
  pluginId: 'contextEngine',
  /**
   * Bump this whenever the YAML below changes, or the change reaches nobody who already has
   * analysis switched on.
   *
   * Installing over an existing instance is a no-op unless the definition hash, this version or the
   * template values differ — and the hash of a templated definition is taken from the template
   * *function*, not the YAML it renders. So an edit to `feedback_analysis.yaml` alone is invisible
   * to that check: the stored snapshot keeps whatever it was installed with, forever. This number is
   * the only thing that moves it.
   *
   * 2: analysis no longer requires signals, so runs are gated on `can_analyze` instead.
   */
  version: 2,
  billable: false,
  yamlTemplate: ({ aiIndexId, intervalMinutes }) =>
    renderTemplate(FEEDBACK_ANALYSIS_YAML, {
      __AI_INDEX_ID__: aiIndexId,
      __INTERVAL_MINUTES__: intervalMinutes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineFeedbackAnalysisWorkflowTemplateValues>;
