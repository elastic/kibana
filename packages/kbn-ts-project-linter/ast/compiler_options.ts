/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Jsonc } from '@kbn/bazel-packages';

import { T } from './babel';
import { getAst } from './ast';
import { getEnds, getExpandedEnds } from './ends';
import { getProp, getEndOfLastProp } from './props';

export function getCompilerOptions(source: string) {
  const compilerOptions = getProp(getAst(source), 'compilerOptions');
  if (!compilerOptions) {
    throw new Error('unable to find compilerOptions property');
  }
  if (!T.isObjectExpression(compilerOptions.value)) {
    throw new Error('expected compilerOptions property to be an object expression');
  }

  return compilerOptions.value;
}

export function setCompilerOption(source: string, name: string, value: any) {
  const compilerOptions = getCompilerOptions(source);

  const existing = getProp(compilerOptions, name);
  if (existing) {
    const [start, end] = getEnds(existing.value);
    return source.slice(0, start) + JSON.stringify(value) + source.slice(end);
  }

  if (
    !compilerOptions.properties.length ||
    compilerOptions.loc?.start.line === compilerOptions.loc?.end.line
  ) {
    // convert to multiline
    const orig = (Jsonc.parse(source) as any).compilerOptions;
    const [start, end] = getEnds(compilerOptions);
    return (
      source.slice(0, start) +
      JSON.stringify(
        {
          ...orig,
          [name]: value,
        },
        null,
        2
      )
        .split('\n')
        .map((l, i) => (i === 0 ? l : `  ${l}`))
        .join('\n') +
      source.slice(end)
    );
  }

  const endOfLastProp = getEndOfLastProp(compilerOptions);
  let left = source.slice(0, endOfLastProp);
  while (left.at(-1) === ',') {
    left = left.slice(0, -1);
  }
  const right = source.slice(endOfLastProp);
  return left + `,\n    ${JSON.stringify(name)}: ${JSON.stringify(value)}` + right;
}

export function removeCompilerOption(source: string, name: string) {
  const compilerOptions = getCompilerOptions(source);

  const culprit = getProp(compilerOptions, name);
  if (!culprit) {
    throw new Error(`unable to find compiler option "${name}"`);
  }

  const [start, end] = getExpandedEnds(source, culprit);
  return source.slice(0, start) + source.slice(end);
}
