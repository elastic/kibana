/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery, mutate } from '@elastic/esql';

/**
 * Inserts a newly created index into the FROM command of the query. Used when an index is created
 * from an empty FROM slot, where the query does not yet reference it by name. When the index is
 * already listed the query is returned unchanged.
 */
export function appendIndexToFromCommand(esql: string, createdIndexName: string): string {
  if (!createdIndexName) {
    return esql;
  }

  const query = EsqlQuery.fromSrc(esql);
  mutate.commands.from.sources.upsert(query.ast, createdIndexName);
  return query.print();
}
