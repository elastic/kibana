/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAst } from './ast';
import { getProp } from './props';
import { getEnds } from './ends';
import { getEndOfLastProp } from './props';

export function setExclude(source: string, excludes: string[]) {
  const ast = getAst(source);
  const newExcludes = `"exclude": [\n${excludes
    .map((e) => `    ${JSON.stringify(e)},`)
    .join('\n')}\n  ]`;

  const existing = getProp(ast, 'exclude');
  if (existing) {
    const [start, end] = getEnds(existing);
    return source.slice(0, start) + newExcludes + source.slice(end);
  }

  const endOfLastProp = getEndOfLastProp(ast);
  return source.slice(0, endOfLastProp) + `,\n  ${newExcludes}` + source.slice(endOfLastProp);
}
