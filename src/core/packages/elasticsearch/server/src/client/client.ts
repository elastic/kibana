/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * List of all the "indices" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsCurrentUserIndices {
  /**
   * @deprecated
   */
  resolveIndex: Client['indices']['resolveIndex'];
}

/**
 * List of all the "esql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsCurrentUserEsql {
  /**
   * @deprecated
   */
  query: Client['esql']['query'];
  /**
   * @deprecated
   */
  asyncQuery: Client['esql']['asyncQuery'];
}

/**
 * List of all the "sql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsCurrentUserSql {
  /**
   * @deprecated
   */
  query: Client['sql']['query'];
}

/**
 * List of all the "eql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsCurrentUserEql {
  /**
   * @deprecated
   */
  search: Client['eql']['search'];
}

/**
 * List of all the methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsCurrentUser {
  /**
   * @deprecated
   */
  search: Client['search'];
  /**
   * @deprecated
   */
  asyncSearch: Client['asyncSearch'];
  /**
   * @deprecated
   */
  msearch: Client['msearch'];
  /**
   * @deprecated
   */
  searchTemplate: Client['searchTemplate'];
  /**
   * @deprecated
   */
  msearchTemplate: Client['msearchTemplate'];
  /**
   * @deprecated
   */
  count: Client['count'];
  /**
   * @deprecated
   */
  fieldCaps: Client['fieldCaps'];
  /**
   * @deprecated
   */
  scriptsPainlessExecute: Client['scriptsPainlessExecute'];
  indices: ElasticsearchClientOverridesAsCurrentUserIndices &
    Omit<Client['indices'], keyof ElasticsearchClientOverridesAsCurrentUserIndices>;
  esql: ElasticsearchClientOverridesAsCurrentUserEsql &
    Omit<Client['esql'], keyof ElasticsearchClientOverridesAsCurrentUserEsql>;
  sql: ElasticsearchClientOverridesAsCurrentUserSql &
    Omit<Client['sql'], keyof ElasticsearchClientOverridesAsCurrentUserSql>;
  eql: ElasticsearchClientOverridesAsCurrentUserEql &
    Omit<Client['eql'], keyof ElasticsearchClientOverridesAsCurrentUserEql>;
  /**
   * @deprecated
   */
  searchMvt: Client['searchMvt'];
}

/**
 * List of all the "indices" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsInternalIndices {
  /**
   * @deprecated
   */
  resolveIndex: Client['indices']['resolveIndex'];
}

/**
 * List of all the "esql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsInternalEsql {
  /**
   * @deprecated
   */
  query: Client['esql']['query'];
  /**
   * @deprecated
   */
  asyncQuery: Client['esql']['asyncQuery'];
}

/**
 * List of all the "sql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsInternalSql {
  /**
   * @deprecated
   */
  query: Client['sql']['query'];
}

/**
 * List of all the "eql" methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsInternalEql {
  /**
   * @deprecated
   */
  search: Client['eql']['search'];
}

/**
 * List of all the methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverridesAsInternal {
  /**
   * @deprecated
   */
  search: Client['search'];
  /**
   * @deprecated
   */
  asyncSearch: Client['asyncSearch'];
  /**
   * @deprecated
   */
  msearch: Client['msearch'];
  /**
   * @deprecated
   */
  searchTemplate: Client['searchTemplate'];
  /**
   * @deprecated
   */
  msearchTemplate: Client['msearchTemplate'];
  /**
   * @deprecated
   */
  count: Client['count'];
  /**
   * @deprecated
   */
  fieldCaps: Client['fieldCaps'];
  /**
   * @deprecated
   */
  scriptsPainlessExecute: Client['scriptsPainlessExecute'];
  indices: ElasticsearchClientOverridesAsInternalIndices &
    Omit<Client['indices'], keyof ElasticsearchClientOverridesAsInternalIndices>;
  esql: ElasticsearchClientOverridesAsInternalEsql &
    Omit<Client['esql'], keyof ElasticsearchClientOverridesAsInternalEsql>;
  sql: ElasticsearchClientOverridesAsInternalSql &
    Omit<Client['sql'], keyof ElasticsearchClientOverridesAsInternalSql>;
  eql: ElasticsearchClientOverridesAsInternalEql &
    Omit<Client['eql'], keyof ElasticsearchClientOverridesAsInternalEql>;
  /**
   * @deprecated
   */
  searchMvt: Client['searchMvt'];
}

/**
 * Client used to query the elasticsearch cluster with the Kibana internal user.
 *
 * @public
 */
export type ElasticsearchClientInternal = ElasticsearchClientOverridesAsInternal &
  Omit<
    Client,
    | 'connectionPool'
    | 'serializer'
    | 'extend'
    | 'close'
    | 'diagnostic'
    | keyof ElasticsearchClientOverridesAsInternal
  >;

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = ElasticsearchClientOverridesAsCurrentUser &
  Omit<
    Client,
    | 'connectionPool'
    | 'serializer'
    | 'extend'
    | 'close'
    | 'diagnostic'
    | keyof ElasticsearchClientOverridesAsCurrentUser
  >;
