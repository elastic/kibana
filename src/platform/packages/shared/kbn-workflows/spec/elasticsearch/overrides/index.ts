/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BULK_CONTRACT } from './elasticsearch.bulk';
import { INDEX_CONTRACT } from './elasticsearch.index';
import { INDICES_CREATE_CONTRACT } from './elasticsearch.indices_create';
import { SEARCH_CONTRACT } from './elasticsearch.search';

export const ELASTICSEARCH_OVERRIDES = {
  'elasticsearch.bulk': BULK_CONTRACT,
  'elasticsearch.indices.create': INDICES_CREATE_CONTRACT,
  'elasticsearch.index': INDEX_CONTRACT,
  'elasticsearch.search': SEARCH_CONTRACT,
};
