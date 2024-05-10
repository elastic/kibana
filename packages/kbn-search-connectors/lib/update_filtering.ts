/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX } from '..';
import { fetchConnectorById } from './fetch_connectors';
import {
  Connector,
  FilteringRule,
  FilteringRules,
  FilteringValidationState,
} from '../types/connectors';

export const updateFiltering = async (
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
  const connector = await fetchConnectorById(client, connectorId);
  if (!connector) {
    throw new Error(`Could not find connector with id ${connectorId}`);
  }
  const active: FilteringRules = {
    advanced_snippet: {
      created_at: connector.filtering[0].active.advanced_snippet.created_at || now,
      updated_at: now,
      value: parsedAdvancedSnippet,
    },
    rules: parsedFilteringRules,
    validation: {
      errors: [],
      state: FilteringValidationState.VALID,
    },
  };

  const result = await client.update<Connector>({
    doc: { ...connector, filtering: [{ ...connector.filtering[0], active, draft: active }] },
    id: connectorId,
    index: CONNECTORS_INDEX,
  });

  return result.result === 'updated' ? active : undefined;
};
