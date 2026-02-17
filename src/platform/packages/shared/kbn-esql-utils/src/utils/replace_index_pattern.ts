/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery, mutate } from '@kbn/esql-language';

export function replaceESQLQueryIndexPattern(esql: string, replacements: Record<string, string>) {
  const inputQuery = EsqlQuery.fromSrc(esql);
  const outputQuery = EsqlQuery.fromSrc(esql);

  for (const [source, target] of Object.entries(replacements)) {
    const { index: sourceIndex, cluster: sourceCluster } = parseIndex(source);
    const { index: targetIndex, cluster: targetCluster } = parseIndex(target);

    while (mutate.commands.from.sources.remove(inputQuery.ast, sourceIndex, sourceCluster)) {
      mutate.commands.from.sources.remove(outputQuery.ast, sourceIndex, sourceCluster);
      mutate.commands.from.sources.upsert(outputQuery.ast, targetIndex, targetCluster);
    }
  }

  return outputQuery.print();
}

function parseIndex(index: string): { index: string; cluster?: string } {
  const split = index.split(':');
  if (split.length === 2) {
    return { index: split[1], cluster: split[0] };
  }
  return { index };
}
