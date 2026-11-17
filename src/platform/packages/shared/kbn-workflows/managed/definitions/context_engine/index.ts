/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DREAMING_YAML from './dreaming.yaml';
import ENRICHMENT_YAML from './dreaming_enrichment.yaml';
import TRACE_DREAMING_YAML from './dreaming_traces.yaml';
import TRACE_DREAMING_BATCH_YAML from './dreaming_traces_batch.yaml';
import WIKI_YAML from './dreaming_wiki.yaml';
import FEEDBACK_ANALYSIS_YAML from './feedback_analysis.yaml';
import RELATIONSHIPS_YAML from './relationships.yaml';
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
  /** The relationship types to link; when empty, the relationships step is skipped. */
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

/** Consolidates the memories of one AI index into long-term facts and entities. */
export const CONTEXT_ENGINE_DREAMING_WORKFLOW = {
  id: CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 5,
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
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineDreamingWorkflowTemplateValues>;

export const CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID = 'system-context-engine-trace-dreaming';

/** The same config as dreaming, which trace dreaming runs alongside on the same schedule. */
export type ContextEngineTraceDreamingWorkflowTemplateValues =
  ContextEngineDreamingWorkflowTemplateValues;

/**
 * Extracts long-term facts and entities from the agent conversations the trace sources of one AI
 * index record.
 */
export const CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW = {
  id: CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 5,
  billable: false,
  yamlTemplate: (values) =>
    renderJsonTemplate(TRACE_DREAMING_YAML, {
      __NAME__: `Trace dreaming: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-trace-dreaming-${values.instanceKey}`,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __BATCH_WORKFLOW_ID__: `${CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID}-${values.instanceKey}`,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineTraceDreamingWorkflowTemplateValues>;

export const CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID =
  'system-context-engine-trace-dreaming-batch';

/** The same config as dreaming: a batch is extracted with its types and instructions. */
export type ContextEngineTraceDreamingBatchWorkflowTemplateValues =
  ContextEngineDreamingWorkflowTemplateValues;

/**
 * Extracts long-term facts and entities from one batch of agent rounds, without reading the AI
 * index's existing ones.
 */
export const CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW = {
  id: CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 5,
  billable: false,
  yamlTemplate: (values) =>
    renderJsonTemplate(TRACE_DREAMING_BATCH_YAML, {
      __NAME__: `Trace dreaming batch: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __FACT_TYPES__: values.factTypes,
      __ENTITY_TYPES__: values.entityTypes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineTraceDreamingBatchWorkflowTemplateValues>;

export const CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID = 'system-context-engine-relationships';

/** The same config as dreaming, which the relationships workflow runs alongside. */
export type ContextEngineRelationshipsWorkflowTemplateValues =
  ContextEngineDreamingWorkflowTemplateValues;

/**
 * Links the long-term facts and entities of one AI index with the relationship types of its
 * dreaming config, as they change: creates, updates and deletes their relationships.
 */
export const CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW = {
  id: CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 1,
  billable: false,
  yamlTemplate: (values) =>
    renderJsonTemplate(RELATIONSHIPS_YAML, {
      __NAME__: `Relationships: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-relationships-${values.instanceKey}`,
      __MEMORIES_INDEX__: values.memoriesIndex,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __RELATIONSHIP_TYPES__: values.relationshipTypes,
    }),
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineRelationshipsWorkflowTemplateValues>;

export const CONTEXT_ENGINE_ENRICHMENT_WORKFLOW_ID = 'system-context-engine-enrichment';

// Mirrors Context Engine's DEFAULT_ENRICHMENT_MAX_DOCUMENTS, which this package cannot import.
const DEFAULT_ENRICHMENT_MAX_DOCUMENTS = 10;

/** The enrichment part of an AI index dreaming config. */
export interface ContextEngineEnrichmentTemplateConfig {
  /** Which knowledge items are worth improving. */
  selection: string;
  /** What to improve them in. */
  improvement: string;
  /** At most how many knowledge items one run improves. */
  maxDocuments: number;
}

/** The dreaming config, with what enrichment improves. */
export interface ContextEngineEnrichmentWorkflowTemplateValues
  extends ContextEngineDreamingWorkflowTemplateValues {
  enrichment: ContextEngineEnrichmentTemplateConfig;
}

/**
 * Improves the knowledge items of one AI index with what its sources say: picks the items worth
 * improving, researches each in the sources, and rewrites it citing what it found.
 */
export const CONTEXT_ENGINE_ENRICHMENT_WORKFLOW = {
  id: CONTEXT_ENGINE_ENRICHMENT_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 1,
  billable: false,
  yamlTemplate: (values) => {
    const {
      selection = '',
      improvement = '',
      maxDocuments = DEFAULT_ENRICHMENT_MAX_DOCUMENTS,
    } = values.enrichment ?? {};
    return renderJsonTemplate(ENRICHMENT_YAML, {
      __NAME__: `Enrichment: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-enrichment-${values.instanceKey}`,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __SELECTION__: selection,
      __IMPROVEMENT__: improvement,
      __MAX_DOCUMENTS__: maxDocuments,
    });
  },
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineEnrichmentWorkflowTemplateValues>;

export const CONTEXT_ENGINE_WIKI_WORKFLOW_ID = 'system-context-engine-wiki';

/** The wiki part of an AI index dreaming config. */
export interface ContextEngineWikiTemplateConfig {
  /** Which pages to build and how to write them. */
  instructions: string;
  /** The KI types pages are built from: exact types, or prefixes such as `fact.*`. */
  kiTypes: string[];
  /** At most how many pages one run creates or updates. */
  maxPages: number;
  /** Whether pages also draw on the sources of the AI index. */
  research: boolean;
}

/** The dreaming config, with what wiki pages are built from. */
export interface ContextEngineWikiWorkflowTemplateValues
  extends ContextEngineDreamingWorkflowTemplateValues {
  wiki: ContextEngineWikiTemplateConfig;
}

// Mirror Context Engine's constants, which this package cannot import.
const WIKI_PAGE_KI_TYPE = 'wiki.page';
const RELATIONSHIP_KI_TYPE = 'memory.relationship';
const DEFAULT_WIKI_KI_TYPES = ['fact.*', 'entity.*'];
const DEFAULT_WIKI_MAX_PAGES = 5;

/** The ES query for the knowledge items wiki pages are built from. */
export const wikiMemberTypeQuery = (kiTypes: readonly string[]) => ({
  bool: {
    should: kiTypes.map((filter) =>
      filter.endsWith('.*') ? { prefix: { type: filter.slice(0, -1) } } : { term: { type: filter } }
    ),
    minimum_should_match: 1,
    must_not: [{ terms: { type: [WIKI_PAGE_KI_TYPE, RELATIONSHIP_KI_TYPE] } }],
  },
});

/**
 * Builds wiki-style overview pages for one AI index: plans which pages the knowledge items that
 * changed belong in, gathers each page's members, researches its topic in the sources, and writes
 * the page.
 */
export const CONTEXT_ENGINE_WIKI_WORKFLOW = {
  id: CONTEXT_ENGINE_WIKI_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 1,
  billable: false,
  yamlTemplate: (values) => {
    const {
      instructions = '',
      kiTypes = DEFAULT_WIKI_KI_TYPES,
      maxPages = DEFAULT_WIKI_MAX_PAGES,
      research = true,
    } = values.wiki ?? {};
    return renderJsonTemplate(WIKI_YAML, {
      __NAME__: `Wiki pages: ${values.aiIndexId}`,
      __AI_INDEX_ID__: values.aiIndexId,
      __CONCURRENCY_KEY__: `context-engine-wiki-${values.instanceKey}`,
      __MEMORIES_INDEX__: values.memoriesIndex,
      __INTERVAL_MINUTES__: values.intervalMinutes,
      __CONNECTOR_ID__: values.connectorId,
      __INSTRUCTIONS__: values.instructions,
      __WIKI_INSTRUCTIONS__: instructions,
      __MAX_PAGES__: maxPages,
      __RESEARCH__: research,
      __MEMBER_TYPE_QUERY__: wikiMemberTypeQuery(kiTypes),
    });
  },
  management: CONTEXT_ENGINE_WORKFLOW_MANAGEMENT,
} as const satisfies ManagedWorkflowDefinition<ContextEngineWikiWorkflowTemplateValues>;
