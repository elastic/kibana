/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
export interface ShardFailureRequest {
  docvalue_fields: string[];
  _source: unknown;
  query: unknown;
  script_fields: unknown;
  sort: unknown;
  stored_fields: string[];
}

export interface ShardFailure {
  index: string;
  node: string;
  reason: {
    caused_by: {
      reason: string;
      type: string;
    };
    reason: string;
    lang?: estypes.ScriptLanguage;
    script?: string;
    script_stack?: string[];
    type: string;
  };
  shard: number;
}
