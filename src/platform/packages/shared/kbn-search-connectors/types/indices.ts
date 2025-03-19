/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HealthStatus,
  IndexName,
  IndicesStatsIndexMetadataState,
  Uuid,
} from '@elastic/elasticsearch/lib/api/types';
import { Connector } from './connectors';

export enum IngestionStatus {
  CONFIGURED,
  CONNECTED,
  ERROR,
  SYNC_ERROR,
  INCOMPLETE,
}

export enum IngestionMethod {
  CONNECTOR = 'connector',
  CRAWLER = 'crawler',
  API = 'api',
}

export interface ElasticsearchIndex {
  count: number; // Elasticsearch _count
  has_in_progress_syncs?: boolean; // these default to false if not a connector or crawler
  has_pending_syncs?: boolean;
  health?: HealthStatus;
  hidden: boolean;
  name: IndexName;
  status?: IndicesStatsIndexMetadataState;
  total: {
    docs: {
      count: number; // Lucene count (includes nested documents)
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  uuid?: Uuid;
}

export interface ElasticsearchViewIndexExtension {
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  lastUpdated: string | 'never' | null; // date string
}

export interface ConnectorIndex extends ElasticsearchIndex {
  connector: Connector;
}
