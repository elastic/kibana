/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type AggregateQuery,
  type Filter,
  type KueryNode,
  type Query,
  fromKueryExpression,
  getFilterField,
  getFilterParams,
  getPhraseFilterValue,
  isFilterDisabled,
  isPhraseFilter,
  isPhrasesFilter,
  isScriptedPhraseFilter,
  nodeTypes,
} from '@kbn/es-query';
import {
  type InvestigationEntityField,
  type InvestigationSeed,
  INVESTIGATION_ENTITY_FIELDS,
  MAX_INVESTIGATION_FIELD_CHARS,
  isEsqlQuery,
} from './investigation_seed_schema';

const EXTRACTABLE_ENTITY_FIELDS: ReadonlySet<InvestigationEntityField> = new Set([
  'service.name',
  'service.environment',
  'host.name',
  'container.id',
  'user.name',
  'source.ip',
]);

const isExtractableEntityField = (field: string | undefined): field is InvestigationEntityField =>
  typeof field === 'string' && EXTRACTABLE_ENTITY_FIELDS.has(field as InvestigationEntityField);

const asBoundedEntityValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= MAX_INVESTIGATION_FIELD_CHARS
      ? trimmed
      : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const stringified = String(value);
    return stringified.length <= MAX_INVESTIGATION_FIELD_CHARS ? stringified : undefined;
  }
  return undefined;
};

/** Extracts positive phrase or phrases filter values for the supported entity fields. */
export const extractEntitiesFromFilters = (
  filters: readonly Filter[]
): InvestigationSeed['entities'] => {
  const entities: InvestigationSeed['entities'] = {};

  for (const filter of filters) {
    if (isFilterDisabled(filter) || filter.meta?.negate) {
      continue;
    }
    const field = getFilterField(filter);
    if (!isExtractableEntityField(field) || entities[field] !== undefined) {
      continue;
    }
    if (isPhraseFilter(filter) || isScriptedPhraseFilter(filter)) {
      const value = asBoundedEntityValue(getFilterParams(filter) ?? getPhraseFilterValue(filter));
      if (value) {
        entities[field] = value;
      }
      continue;
    }
    if (isPhrasesFilter(filter)) {
      const params = getFilterParams(filter);
      const first = Array.isArray(params) ? params[0] : undefined;
      const value = asBoundedEntityValue(first);
      if (value) {
        entities[field] = value;
      }
    }
  }

  return entities;
};

const collectPositiveKqlEntities = (node: KueryNode, out: InvestigationSeed['entities']): void => {
  if (!nodeTypes.function.isNode(node)) {
    return;
  }

  if (node.function === 'and') {
    for (const child of node.arguments) {
      if (child && typeof child === 'object' && 'type' in child) {
        collectPositiveKqlEntities(child as KueryNode, out);
      }
    }
    return;
  }

  if (node.function !== 'is') {
    return;
  }

  const [fieldNode, valueNode] = node.arguments as Array<KueryNode | undefined>;
  if (
    !fieldNode ||
    !valueNode ||
    !nodeTypes.literal.isNode(fieldNode) ||
    !nodeTypes.literal.isNode(valueNode)
  ) {
    return;
  }

  const field = typeof fieldNode.value === 'string' ? fieldNode.value : undefined;
  if (!isExtractableEntityField(field) || out[field] !== undefined) {
    return;
  }

  const value = asBoundedEntityValue(valueNode.value);
  if (value) {
    out[field] = value;
  }
};

/** Extracts positive top-level KQL equality terms for the supported entity fields. */
export const extractEntitiesFromKql = (
  query: Query | AggregateQuery | undefined
): InvestigationSeed['entities'] => {
  if (!query || isEsqlQuery(query)) {
    return {};
  }
  if (query.language !== 'kuery' && query.language !== 'kql') {
    return {};
  }
  if (typeof query.query !== 'string') {
    return {};
  }

  const trimmed = query.query.trim();
  if (trimmed.length === 0) {
    return {};
  }

  try {
    const ast = fromKueryExpression(trimmed);
    const entities: InvestigationSeed['entities'] = {};
    collectPositiveKqlEntities(ast, entities);
    return entities;
  } catch {
    return {};
  }
};

/**
 * Merges entity fields with clicked breakdown filters taking precedence over
 * ambient filters, and ambient filters taking precedence over KQL terms.
 */
export const extractSeedEntities = ({
  clickedFilters = [],
  filters = [],
  query,
}: {
  clickedFilters?: readonly Filter[];
  filters?: readonly Filter[];
  query?: Query | AggregateQuery;
}): InvestigationSeed['entities'] => {
  const fromClicked = extractEntitiesFromFilters(clickedFilters);
  const fromFilters = extractEntitiesFromFilters(filters);
  const fromQuery = extractEntitiesFromKql(query);
  const merged: InvestigationSeed['entities'] = {};

  for (const field of INVESTIGATION_ENTITY_FIELDS) {
    const value = fromClicked[field] ?? fromFilters[field] ?? fromQuery[field];
    if (value) {
      merged[field] = value;
    }
  }

  return merged;
};
