/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This file is nothing more than type signatures for the subset of
 * elasticsearch.js that migrations use. There is no actual logic /
 * funcationality contained here.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type AliasAction =
  | {
      remove_index: { index: string };
    }
  | { remove: { index: string; alias: string } }
  | { add: { index: string; alias: string } };

export interface RawDoc {
  _id: estypes.Id;
  _source: any;
  _type?: string;
}
