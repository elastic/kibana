/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Jsonc } from '@kbn/repo-packages';

import { T } from './babel';
import { getAst } from './ast';
import { getEnds, getExpandedEnds } from './ends';
import { getProp, getEndOfLastProp } from './props';
import { snip } from './snip';
import { redentJson, stringify } from './json';

export function getCompilerOptions(ast: T.ObjectExpression) {
  const compilerOptions = getProp(ast, 'compilerOptions');
  if (!compilerOptions) {
    throw new Error('unable to find compilerOptions property');
  }
  if (!T.isObjectExpression(compilerOptions.value)) {
    throw new Error('expected compilerOptions property to be an object expression');
  }

  return compilerOptions.value;
}

export function setCompilerOption(source: string, name: string, value: any) {
  const ast = getAst(source);
  if (!getProp(ast, 'compilerOptions')) {
    const firstProp = ast.properties.at(0);
    if (!firstProp) {
      return stringify({ compilerOptions: { [name]: value } });
    }

    const extendsProp = getProp(ast, 'extends');

    if (extendsProp) {
      const after = getEnds(extendsProp)[1];
      return snip(source, [
        [after, after, `,\n  "compilerOptions": ${redentJson({ [name]: value })}`],
      ]);
    }

    const before = getEnds(firstProp)[0];
    return snip(source, [
      [before, before, `"compilerOptions": ${redentJson({ [name]: value })},\n  `],
    ]);
  }

  const compilerOptions = getCompilerOptions(ast);

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
    return source.slice(0, start) + redentJson({ ...orig, [name]: value }) + source.slice(end);
  }

  const endOfLastProp = getEndOfLastProp(compilerOptions);
  let left = source.slice(0, endOfLastProp);
  while (left.at(-1) === ',') {
    left = left.slice(0, -1);
  }
  const right = source.slice(endOfLastProp);
  return left + `,\n    ${JSON.stringify(name)}: ${redentJson(value, '    ')}` + right;
}

export function removeCompilerOption(source: string, name: string) {
  const ast = getAst(source);
  const compilerOptions = getCompilerOptions(ast);

  const culprit = getProp(compilerOptions, name);
  if (!culprit) {
    throw new Error(`unable to find compiler option "${name}"`);
  }

  const [start, end] = getExpandedEnds(source, culprit);
  return source.slice(0, start) + source.slice(end);
}
