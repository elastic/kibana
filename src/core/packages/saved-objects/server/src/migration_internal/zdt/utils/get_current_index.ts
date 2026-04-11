/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import type { Aliases } from '../../model/helpers';

export const getCurrentIndex = ({
  indices,
  aliases,
  indexPrefix,
}: {
  indices: string[];
  aliases: Aliases;
  indexPrefix: string;
}): string | undefined => {
  // if there is already a current alias pointing to an index, we reuse the index.
  if (aliases[indexPrefix] && indices.includes(aliases[indexPrefix]!)) {
    return aliases[indexPrefix];
  }

  const matcher = new RegExp(`^${escapeRegExp(indexPrefix)}[_](?<counter>\\d+)$`);

  let lastCount = -1;
  indices.forEach((indexName) => {
    const match = matcher.exec(indexName);
    if (match && match.groups?.counter) {
      const suffix = parseInt(match.groups.counter, 10);
      lastCount = Math.max(lastCount, suffix);
    }
  });

  return lastCount === -1 ? undefined : `${indexPrefix}_${lastCount}`;
};
