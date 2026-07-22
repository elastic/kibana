/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, Walker, isSource } from '@elastic/esql';
import { resolveLookupJoinTarget } from '@kbn/esql-language';

export interface LookupIndexReference {
  /** Source as it appears in the ES|QL query. */
  sourceName: string;
  /** Index name used by Elasticsearch APIs. */
  indexName: string;
  isCoordinator: boolean;
}

/** Returns the lookup indices referenced by JOIN commands, including the ones inside FORK branches. */
export function getLookupIndexReferencesFromQuery(esqlQuery: string): LookupIndexReference[] {
  const references = new Map<string, LookupIndexReference>();
  const { root } = Parser.parse(esqlQuery);
  const joinCommands = Walker.matchAll(root, { type: 'command', name: 'join' });

  for (const command of joinCommands) {
    const source = Walker.match(command, { type: 'source' });
    if (!isSource(source) || !source.name) {
      continue;
    }

    const { isCoordinator, indexName } = resolveLookupJoinTarget(source);

    references.set(source.name, {
      sourceName: source.name,
      indexName,
      isCoordinator,
    });
  }

  return [...references.values()];
}
