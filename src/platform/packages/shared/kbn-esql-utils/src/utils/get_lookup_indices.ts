/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, Walker, isSource } from '@elastic/esql';
import { hasRemoteIndexSource, resolveLookupJoinTarget } from '@kbn/esql-language';

export interface LookupIndexReference {
  /** Source as it appears in the ES|QL query. */
  sourceName: string;
  /** Index name used by Elasticsearch APIs. */
  indexName: string;
  isCoordinator: boolean;
  isRemote: boolean;
}

/**
 * Extracts and returns a list of unique lookup indices from the provided ESQL query by parsing the query and traversing its AST.
 *
 * @param {string} esqlQuery - The ESQL query string to parse and analyze for lookup join references.
 * @return {LookupIndexReference[]} An array of unique lookup indices found in the query.
 */
export function getLookupIndexReferencesFromQuery(esqlQuery: string): LookupIndexReference[] {
  const references = new Map<string, LookupIndexReference>();
  const { root } = Parser.parse(esqlQuery);
  const hasRemoteSource = hasRemoteIndexSource(root.commands);
  const joinCommands = Walker.matchAll(root, { type: 'command', name: 'join' });

  for (const command of joinCommands) {
    const source = Walker.match(command, { type: 'source' });
    if (!isSource(source) || !source.name) {
      continue;
    }

    const { isCoordinator, indexName } = resolveLookupJoinTarget(source);
    const isRemote = !isCoordinator && hasRemoteSource;

    references.set(source.name, {
      sourceName: source.name,
      indexName,
      isCoordinator,
      isRemote,
    });
  }

  return [...references.values()];
}
