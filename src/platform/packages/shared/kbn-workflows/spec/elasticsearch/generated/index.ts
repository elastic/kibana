/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository (https://github.com/elastic/elasticsearch-specification/commit/868f66c).
 * Generated at: 2026-01-21T16:44:56.585Z
 * Source: elasticsearch-specification repository (8 APIs)
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

// import contracts from individual files
import { BULK_CONTRACT } from './elasticsearch.bulk.gen';
import { ESQL_QUERY_CONTRACT } from './elasticsearch.esql_query.gen';
import { INDEX_CONTRACT } from './elasticsearch.index.gen';
import { INDICES_CREATE_CONTRACT } from './elasticsearch.indices_create.gen';
import { INDICES_DELETE_CONTRACT } from './elasticsearch.indices_delete.gen';
import { INDICES_EXISTS_CONTRACT } from './elasticsearch.indices_exists.gen';
import { SEARCH_CONTRACT } from './elasticsearch.search.gen';
import { UPDATE_CONTRACT } from './elasticsearch.update.gen';
import type { InternalConnectorContract } from '../../../types/latest';

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
  BULK_CONTRACT,
  ESQL_QUERY_CONTRACT,
  INDEX_CONTRACT,
  INDICES_CREATE_CONTRACT,
  INDICES_DELETE_CONTRACT,
  INDICES_EXISTS_CONTRACT,
  SEARCH_CONTRACT,
  UPDATE_CONTRACT,
];
