/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsHitRecord } from '../types';
/**
 * Returning a generated id of a given ES document, since `_id` can be the same
 * when using different indices and shard routing
 */
export const getDocId = (doc: EsHitRecord & { _routing?: string }) => {
  const routing = doc._routing ? doc._routing : '';
  return [doc._index, doc._id, routing].join('::');
};
