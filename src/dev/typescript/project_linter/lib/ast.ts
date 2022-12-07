/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseExpression } from '@babel/parser';
import * as T from '@babel/types';
import { Jsonc } from '@kbn/bazel-packages';

function getProp(obj: T.ObjectExpression, name: string) {
  return obj.properties.find((p): p is T.ObjectProperty & { key: T.StringLiteral } => {
    return T.isObjectProperty(p) && T.isStringLiteral(p.key) && p.key.value === name;
  });
}

function getAst(source: string) {
  const ast = parseExpression(source);
  if (!T.isObjectExpression(ast)) {
    throw new Error('expected tsconfig.json file to be an object expression');
  }
  return ast;
}

function getCompilerOptions(source: string) {
  const compilerOptions = getProp(getAst(source), 'compilerOptions');
  if (!compilerOptions) {
    throw new Error('unable to find compilerOptions property');
  }
  if (!T.isObjectExpression(compilerOptions.value)) {
    throw new Error('expected compilerOptions property to be an object expression');
  }

  return compilerOptions.value;
}

function getEnds(node: T.Node) {
  const { start, end } = node;
  if (start == null || end == null) {
    throw new Error('missing start/end of node');
  }
  return [start, end];
}

function getEndOfLastProp(obj: T.ObjectExpression) {
  if (obj.properties.length === 0) {
    throw new Error('object has no properties');
  }

  return obj.properties.reduce((acc, prop) => Math.max(acc, getEnds(prop)[1]), 0);
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

  let [start, end] = getEnds(culprit);

  while (source[start - 1] === ' ' || source[start - 1] === '\n') {
    start -= 1;
  }

  while (source[end] === ',') {
    end += 1;
  }

  return source.slice(0, start) + source.slice(end);
}

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
