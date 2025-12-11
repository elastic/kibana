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
 * This file contains Elasticsearch connector definitions generated from elasticsearch-specification repository (https://github.com/elastic/elasticsearch-specification/commit/6caf375).
 * Generated at: 2025-12-11T13:54:12.731Z
 * Source: elasticsearch-specification repository (8 APIs)
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

// import contracts from individual files
import { COUNT_CONTRACT } from './elasticsearch.count.gen';
import { CREATE_CONTRACT } from './elasticsearch.create.gen';
import { DELETE_CONTRACT } from './elasticsearch.delete.gen';
import { EXISTS_CONTRACT } from './elasticsearch.exists.gen';
import { GET_CONTRACT } from './elasticsearch.get.gen';
import { INDEX_CONTRACT } from './elasticsearch.index.gen';
import { SEARCH_CONTRACT } from './elasticsearch.search.gen';
import { UPDATE_CONTRACT } from './elasticsearch.update.gen';
import type { InternalConnectorContract } from '../../../types/latest';

// export contracts
export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
  COUNT_CONTRACT,
  CREATE_CONTRACT,
  DELETE_CONTRACT,
  EXISTS_CONTRACT,
  GET_CONTRACT,
  INDEX_CONTRACT,
  SEARCH_CONTRACT,
  UPDATE_CONTRACT,
];
