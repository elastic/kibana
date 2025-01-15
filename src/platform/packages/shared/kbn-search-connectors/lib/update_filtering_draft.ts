/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Result } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { fetchConnectorById } from './fetch_connectors';
import { FilteringRule, FilteringRules } from '../types/connectors';

export const updateFilteringDraft = async (
  client: ElasticsearchClient,
  connectorId: string,
  {
    advancedSnippet,
    filteringRules,
  }: {
    advancedSnippet: string;
    filteringRules: FilteringRule[];
  }
): Promise<FilteringRules | undefined> => {
  const now = new Date().toISOString();
  const parsedAdvancedSnippet: Record<string, unknown> = advancedSnippet
    ? JSON.parse(advancedSnippet)
    : {};
  const parsedFilteringRules = filteringRules.map((filteringRule) => ({
    ...filteringRule,
    created_at: filteringRule.created_at ? filteringRule.created_at : now,
    updated_at: now,
  }));

  const draft = {
    advanced_snippet: {
      created_at: now,
      updated_at: now,
      value: parsedAdvancedSnippet,
    },
    rules: parsedFilteringRules,
  };

  const updateDraftFilteringResult = await client.transport.request<{ result: Result }>({
    method: 'PUT',
    path: `/_connector/${connectorId}/_filtering`,
    body: draft,
  });

  if (updateDraftFilteringResult.result === 'updated') {
    const connector = await fetchConnectorById(client, connectorId);
    return connector?.filtering?.[0]?.draft;
  }
  return undefined;
};
