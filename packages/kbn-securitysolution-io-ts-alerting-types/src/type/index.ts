/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

export const type = t.keyof({
  eql: null,
  machine_learning: null,
  query: null,
  saved_query: null,
  threshold: null,
  threat_match: null,
  new_terms: null,
  esql: null,
});
export type Type = t.TypeOf<typeof type>;

export const typeOrUndefined = t.union([type, t.undefined]);
export type TypeOrUndefined = t.TypeOf<typeof typeOrUndefined>;
