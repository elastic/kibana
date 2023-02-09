/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as T from '@babel/types';

export function getEnds(node: T.Node): [number, number] {
  const { start, end } = node;
  if (start == null || end == null) {
    throw new Error('missing start/end of node');
  }
  return [start, end];
}

export function getExpandedEnds(source: string, node: T.Node): [number, number] {
  let [start, end] = getEnds(node);
  while (source[start - 1] === ' ' || source[start - 1] === '\n') {
    start -= 1;
  }

  while (source[end] === ',') {
    end += 1;
  }

  return [start, end];
}
