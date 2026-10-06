/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchCommandDefinition } from '../../../../..';
export declare const commandsMetadata: Record<string, ElasticsearchCommandDefinition>;
export declare enum EsqlCommandNames {
  CHANGE_POINT = 'change_point',
  DEDUP = 'dedup',
  DISSECT = 'dissect',
  DROP = 'drop',
  ENRICH = 'enrich',
  EVAL = 'eval',
  EXPLAIN = 'explain',
  FORK = 'fork',
  GROK = 'grok',
  HIGHLIGHT = 'highlight',
  INLINE_STATS = 'inline_stats',
  IP_LOCATION = 'ip_location',
  KEEP = 'keep',
  LIMIT = 'limit',
  LOOKUP = 'lookup',
  LOOKUP_JOIN = 'lookup_join',
  METRICS_INFO = 'metrics_info',
  MMR = 'mmr',
  MV_EXPAND = 'mv_expand',
  REGISTERED_DOMAIN = 'registered_domain',
  RENAME = 'rename',
  RERANK = 'rerank',
  SAMPLE = 'sample',
  SORT = 'sort',
  STATS = 'stats',
  TS_INFO = 'ts_info',
  URI_PARTS = 'uri_parts',
  USER_AGENT = 'user_agent',
  WHERE = 'where',
}
