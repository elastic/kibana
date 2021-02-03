/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface HasId {
  id: string;
}

function parseFilter(filter: string) {
  const positive: RegExp[] = [];
  const negative: RegExp[] = [];

  for (const segment of filter.split(',')) {
    let trimmed = segment.trim();
    let list = positive;

    if (trimmed.startsWith('!')) {
      trimmed = trimmed.slice(1);
      list = negative;
    }

    list.push(new RegExp(`^${trimmed.split('*').join('.*')}$`));
  }

  return (bundle: HasId) =>
    (!positive.length || positive.some((p) => p.test(bundle.id))) &&
    (!negative.length || !negative.some((p) => p.test(bundle.id)));
}

export function filterById<T extends HasId>(filterStrings: string[], bundles: T[]) {
  const filters = filterStrings.map(parseFilter);
  return bundles.filter((b) => !filters.length || filters.some((f) => f(b)));
}
