/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { filterCatalog } from '../hooks/filter_catalog';

/** Machine-readable signal that selected a recommendation. Extensible — UI must not hardcode the set. */
export type RecommendationSignal = 'solution' | 'connector' | 'data' | 'popular';

export interface RecommendationReason {
  readonly signal: RecommendationSignal;
  /** Short italic reason line on the card (e.g. "Popular in Security"). */
  readonly label: string;
  /** Long-delay tooltip explaining the personalization basis. */
  readonly tooltip: string;
}

export interface RecommendedTemplate {
  readonly template: Template;
  readonly reason: RecommendationReason;
}

export interface RecommendTemplatesSignals {
  /** Active solution nav id (`security`, `observability`, …). */
  readonly solution?: string;
  /**
   * Configured connector action type ids (e.g. `.slack`). When present, templates
   * whose step types share a base connector type rank ahead of solution picks.
   */
  readonly connectorActionTypeIds?: readonly string[];
  /**
   * Opaque data-signal tags from a future detector (e.g. `kubernetes`, `apm`).
   * Matched against template categories when provided.
   */
  readonly dataTags?: readonly string[];
}

export interface RecommendTemplatesInput {
  readonly templates: readonly Template[];
  readonly signals?: RecommendTemplatesSignals;
  /** Max cards to return (default 3). */
  readonly limit?: number;
}

const DEFAULT_LIMIT = 3;

function humanizeSolutionId(id: string): string {
  if (!id) return id;
  return id[0].toUpperCase() + id.slice(1);
}

function humanizeConnectorId(actionTypeId: string): string {
  const bare = actionTypeId.startsWith('.') ? actionTypeId.slice(1) : actionTypeId;
  if (!bare) return actionTypeId;
  return bare[0].toUpperCase() + bare.slice(1);
}

function baseConnectorFromActionTypeId(actionTypeId: string): string {
  return actionTypeId.startsWith('.') ? actionTypeId.slice(1) : actionTypeId;
}

function baseConnectorFromStepType(stepType: string): string {
  const normalized = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [base] = normalized.split('.');
  return base ?? normalized;
}

function solutionReason(solution: string): RecommendationReason {
  const label = humanizeSolutionId(solution);
  return {
    signal: 'solution',
    label: i18n.translate('workflows.library.recommend.reason.solution', {
      defaultMessage: 'Popular in {solution}',
      values: { solution: label },
    }),
    tooltip: i18n.translate('workflows.library.recommend.reason.solutionTooltip', {
      defaultMessage: 'Based on your current solution — {solution}',
      values: { solution: label },
    }),
  };
}

function connectorReason(actionTypeId: string): RecommendationReason {
  const name = humanizeConnectorId(actionTypeId);
  return {
    signal: 'connector',
    label: i18n.translate('workflows.library.recommend.reason.connector', {
      defaultMessage: '{connector} connector configured',
      values: { connector: name },
    }),
    tooltip: i18n.translate('workflows.library.recommend.reason.connectorTooltip', {
      defaultMessage: 'Based on connectors configured in your deployment',
    }),
  };
}

function dataReason(tag: string): RecommendationReason {
  const label = humanizeSolutionId(tag);
  return {
    signal: 'data',
    label: i18n.translate('workflows.library.recommend.reason.data', {
      defaultMessage: '{data} data detected',
      values: { data: label },
    }),
    tooltip: i18n.translate('workflows.library.recommend.reason.dataTooltip', {
      defaultMessage: 'Based on data in your environment — {data}',
      values: { data: label },
    }),
  };
}

function popularReason(): RecommendationReason {
  return {
    signal: 'popular',
    label: i18n.translate('workflows.library.recommend.reason.popular', {
      defaultMessage: 'Popular starter',
    }),
    tooltip: i18n.translate('workflows.library.recommend.reason.popularTooltip', {
      defaultMessage: 'A frequently used template from the Template library',
    }),
  };
}

function matchingConnector(
  template: Template,
  connectorActionTypeIds: readonly string[]
): string | undefined {
  const stepBases = new Set(template.stepTypes.map(baseConnectorFromStepType));
  for (const actionTypeId of connectorActionTypeIds) {
    if (stepBases.has(baseConnectorFromActionTypeId(actionTypeId))) {
      return actionTypeId;
    }
  }
  return undefined;
}

function matchingDataTag(template: Template, dataTags: readonly string[]): string | undefined {
  const categories = new Set(template.categories.map((c) => c.toLowerCase()));
  for (const tag of dataTags) {
    if (categories.has(tag.toLowerCase())) {
      return tag;
    }
  }
  return undefined;
}

/**
 * Ranks catalog templates for the empty-state "Recommended templates" section.
 *
 * Priority: connector → data → solution → curated popular. The UI must render
 * each card's reason from the returned metadata — never invent environment claims.
 */
export function recommendTemplates({
  templates,
  signals = {},
  limit = DEFAULT_LIMIT,
}: RecommendTemplatesInput): RecommendedTemplate[] {
  if (templates.length === 0 || limit <= 0) {
    return [];
  }

  const selected = new Set<string>();
  const results: RecommendedTemplate[] = [];

  const push = (template: Template, reason: RecommendationReason) => {
    if (selected.has(template.slug) || results.length >= limit) return;
    selected.add(template.slug);
    results.push({ template, reason });
  };

  const { solution, connectorActionTypeIds = [], dataTags = [] } = signals;

  if (connectorActionTypeIds.length > 0) {
    for (const template of templates) {
      const match = matchingConnector(template, connectorActionTypeIds);
      if (match) push(template, connectorReason(match));
      if (results.length >= limit) return results;
    }
  }

  if (dataTags.length > 0) {
    for (const template of templates) {
      const match = matchingDataTag(template, dataTags);
      if (match) push(template, dataReason(match));
      if (results.length >= limit) return results;
    }
  }

  if (solution) {
    const solutionTemplates = filterCatalog([...templates], { solution });
    const reason = solutionReason(solution);
    for (const template of solutionTemplates) {
      push(template, reason);
      if (results.length >= limit) return results;
    }
    // Solution context produced matches — do not pad with out-of-solution populars
    // so every card keeps an honest solution-level reason.
    if (results.length > 0) {
      return results;
    }
  }

  const popular = popularReason();
  for (const template of templates) {
    push(template, popular);
    if (results.length >= limit) return results;
  }

  return results;
}
