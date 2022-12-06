/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseExpression } from '@babel/parser';
import * as T from '@babel/types';

import { Rule } from './rule';

const NAMES = ['declaration', 'emitDeclarationOnly', 'outDir'];

function getProp(obj: T.ObjectExpression, name: string) {
  const prop = obj.properties.find((p): p is T.ObjectProperty & { key: T.StringLiteral } => {
    return T.isObjectProperty(p) && T.isStringLiteral(p.key) && p.key.value === name;
  });

  if (!prop) {
    throw new Error(`unable to find property "${name}"`);
  }

  return prop;
}

export function removeCompilerOption(source: string, name: string) {
  const ast = parseExpression(source);
  if (!T.isObjectExpression(ast)) {
    throw new Error('expected tsconfig.json file to be an object expression');
  }

  const compilerOptions = getProp(ast, 'compilerOptions');
  if (!T.isObjectExpression(compilerOptions.value)) {
    throw new Error('expected compilerOptions property to be an object expression');
  }

  const culprit = getProp(compilerOptions.value, name);
  let { start, end } = culprit;
  if (start == null || end == null) {
    throw new Error('missing start/end of property to remove');
  }

  while (source[start - 1] === ' ' || source[start - 1] === '\n') {
    start -= 1;
  }

  while (source[end] === ',') {
    end += 1;
  }

  return source.slice(0, start) + source.slice(end);
}

export const forbiddenCompilerOptions = Rule.create('forbiddenCompilerOptions', {
  check(project) {
    for (const optName of NAMES) {
      const value = project.config.compilerOptions?.[optName];
      if (value === undefined) {
        continue;
      }

      this.err(`specifying the "${optName}" compiler option is forbidden`, (source) => {
        return removeCompilerOption(source, optName);
      });
    }
  },
});
