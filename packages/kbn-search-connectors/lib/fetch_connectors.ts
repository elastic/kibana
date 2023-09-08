/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { OptimisticConcurrency } from '../types/optimistic_concurrency';
import { Connector, ConnectorDocument } from '../types/connectors';

import { isIndexNotFoundException } from '../utils/identify_exceptions';
import { CONNECTORS_INDEX } from '..';
import { isNotNullish } from '../utils/is_not_nullish';

export const fetchConnectorById = async (
  client: ElasticsearchClient,
  connectorId: string
): Promise<OptimisticConcurrency<Connector> | undefined> => {
  try {
    const connectorResult = await client.get<ConnectorDocument>({
      id: connectorId,
      index: CONNECTORS_INDEX,
    });
    return connectorResult._source
      ? {
          primaryTerm: connectorResult._primary_term,
          seqNo: connectorResult._seq_no,
          value: { ...connectorResult._source, id: connectorResult._id },
        }
      : undefined;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return undefined;
    }
    throw error;
  }
};

export const fetchConnectorByIndexName = async (
  client: ElasticsearchClient,
  indexName: string
): Promise<Connector | undefined> => {
  try {
    const connectorResult = await client.search<ConnectorDocument>({
      index: CONNECTORS_INDEX,
      query: { term: { index_name: indexName } },
    });
    // Because we cannot guarantee that the index has been refreshed and is giving us the most recent source
    // we need to fetch the source with a direct get from the index, which will always be up to date
    const result = connectorResult.hits.hits[0]?._source
      ? (await fetchConnectorById(client, connectorResult.hits.hits[0]._id))?.value
      : undefined;
    return result;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return undefined;
    }
    throw error;
  }
};

export const fetchConnectors = async (
  client: ElasticsearchClient,
  indexNames?: string[]
): Promise<Connector[]> => {
  const query: QueryDslQueryContainer = indexNames
    ? { terms: { index_name: indexNames } }
    : { match_all: {} };

  try {
    let hits: Array<SearchHit<Connector>> = [];
    let accumulator: Array<SearchHit<Connector>> = [];

    do {
      const connectorResult = await client.search<Connector>({
        from: accumulator.length,
        index: CONNECTORS_INDEX,
        query,
        size: 1000,
      });
      hits = connectorResult.hits.hits;
      accumulator = accumulator.concat(hits);
    } while (hits.length >= 1000);

    return accumulator
      .map(({ _source, _id }) => (_source ? { ..._source, id: _id } : undefined))
      .filter(isNotNullish);
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return [];
    }
    throw error;
  }
};
