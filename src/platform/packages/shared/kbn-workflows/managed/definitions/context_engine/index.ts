/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DREAMING_YAML from './dreaming.yaml';
import TRACE_DREAMING_YAML from './dreaming_traces.yaml';
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
  version: 1,
  billable: false,
  yamlTemplate: ({ aiIndexId, intervalMinutes }) =>
    renderTemplate(FEEDBACK_ANALYSIS_YAML, {
      __AI_INDEX_ID__: aiIndexId,
      __INTERVAL_MINUTES__: intervalMinutes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineFeedbackAnalysisWorkflowTemplateValues>;

export const CONTEXT_ENGINE_DREAMING_WORKFLOW_ID = 'system-context-engine-dreaming';

export interface ContextEngineDreamingWorkflowTemplateValues extends ManagedWorkflowTemplateValues {
  /** The AI index this instance dreams for. */
  aiIndexId: string;
  /** Unique per AI index and space. */
  instanceKey: string;
  /** The AI index backing store. */
  memoriesIndex: string;
  /** How often the workflow runs. */
  intervalMinutes: number;
  /** The AI connector id; empty for Context Engine's default model. */
  connectorId: string;
  instructions: string;
  factTypes: Array<{ type: string; description?: string }>;
  entityTypes: Array<{ type: string; description?: string; attributes?: string[] }>;
  /** Empty: the relationships step is skipped. */
  relationshipTypes: Array<{ type: string; description?: string }>;
}

const TEMPLATE_TOKEN = /__[A-Z_]+__/g;

const renderJsonTemplate = (template: string, values: Record<string, unknown>): string =>
  template.replace(TEMPLATE_TOKEN, (token) =>
    token in values
      ? typeof values[token] === 'number'
        ? String(values[token])
        : JSON.stringify(values[token])
      : token
  );

/** Consolidates the memories of one AI index into long-term facts, entities and relationships. */
export const CONTEXT_ENGINE_DREAMING_WORKFLOW = {
  id: CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 4,
  billable: false,
  yamlTemplate: (values) =>
    renderJsonTemplate(DREAMING_YAML, {
      __NAME__: `Dreaming: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-dreaming-${values.instanceKey}`,
      __MEMORIES_INDEX__: values.memoriesIndex,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __FACT_TYPES__: values.factTypes,
      __ENTITY_TYPES__: values.entityTypes,
      __RELATIONSHIP_TYPES__: values.relationshipTypes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineDreamingWorkflowTemplateValues>;

export const CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID = 'system-context-engine-trace-dreaming';

/** The same config as dreaming, which trace dreaming runs alongside on the same schedule. */
export type ContextEngineTraceDreamingWorkflowTemplateValues =
  ContextEngineDreamingWorkflowTemplateValues;

/**
 * Extracts long-term facts, entities and relationships from the agent conversations the trace
 * sources of one AI index record.
 */
export const CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW = {
  id: CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 2,
  billable: false,
  yamlTemplate: (values) =>
    renderJsonTemplate(TRACE_DREAMING_YAML, {
      __NAME__: `Trace dreaming: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-trace-dreaming-${values.instanceKey}`,
      __MEMORIES_INDEX__: values.memoriesIndex,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __FACT_TYPES__: values.factTypes,
      __ENTITY_TYPES__: values.entityTypes,
      __RELATIONSHIP_TYPES__: values.relationshipTypes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineTraceDreamingWorkflowTemplateValues>;
