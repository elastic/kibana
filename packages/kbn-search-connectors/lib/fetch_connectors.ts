/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { ConnectorAPIListConnectorsResponse, CONNECTORS_INDEX } from '..';

import { Connector, ConnectorDocument } from '../types/connectors';

import { isNotFoundException } from '../utils/identify_exceptions';
import { CRAWLER_SERVICE_TYPE } from '..';
import { isIndexNotFoundException } from '@kbn/core-saved-objects-migration-server-internal';

export const fetchConnectorById = async (
  client: ElasticsearchClient,
  connectorId: string
): Promise<Connector | undefined> => {
  try {
    const result = await client.transport.request<Connector>({
      method: 'GET',
      path: `/_connector/${connectorId}`,
    });
    return result;
  } catch (err) {
    if (isNotFoundException(err)) {
      return undefined;
    }
    throw err;
  }
};

export const fetchConnectorCrawlerById = async (
  client: ElasticsearchClient,
  connectorCrawlerId: string
): Promise<Connector | undefined> => {
  try {
    const connectorResult = await client.get<Connector>({
      id: connectorCrawlerId,
      index: CONNECTORS_INDEX,
    });
    return connectorResult._source
      ? { ...connectorResult._source, id: connectorResult._id }
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
    const connectorListResult = await client.transport.request<ConnectorAPIListConnectorsResponse>({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        index_name: indexName,
      },
    });
    const result = connectorListResult.count > 0 ? connectorListResult.results[0] : undefined;
    return result;
  } catch (error) {
    throw error;
  }
};

export const fetchConnectors = async (
  client: ElasticsearchClient,
  indexNames?: string[],
  fetchOnlyCrawlers?: boolean,
  searchQuery?: string
): Promise<Connector[]> => {
  const q = searchQuery && searchQuery.length > 0 ? searchQuery : undefined;

  const querystring: Record<string, any> = q
    ? {
        query: q,
      }
    : indexNames
    ? {
        index_name: indexNames.join(','),
      }
    : {};

  let hits: Connector[] = [];
  let accumulator: Connector[] = [];

  do {
    const connectorResult = await client.transport.request<ConnectorAPIListConnectorsResponse>({
      method: 'GET',
      path: `/_connector`,
      querystring: {
        ...querystring,
        from: accumulator.length,
        size: 1000,
      },
    });

    hits = connectorResult.results;
    accumulator = accumulator.concat(hits);
  } while (hits.length >= 1000);

  const result = accumulator;

  if (fetchOnlyCrawlers !== undefined) {
    return result.filter((hit) => {
      return !fetchOnlyCrawlers
        ? hit.service_type !== CRAWLER_SERVICE_TYPE
        : hit.service_type === CRAWLER_SERVICE_TYPE;
    });
  }
  return result;
};
