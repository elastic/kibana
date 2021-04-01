/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ShardFailureRequest } from '../shard_failure_types';
export const shardFailureRequest = {
  version: true,
  size: 500,
  sort: [],
  _source: {
    excludes: [],
  },
  stored_fields: ['*'],
  script_fields: {},
  docvalue_fields: [],
  query: {},
  highlight: {},
} as ShardFailureRequest;
