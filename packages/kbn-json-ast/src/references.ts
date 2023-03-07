/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { T } from './babel';
import { getAst } from './ast';
import { getEnds, getExpandedEnds } from './ends';
import { getProp, getEndOfLastProp } from './props';
import { snip } from './snip';

const PROP = 'kbn_references';

export function addReferences(source: string, refsToAdd: string[]) {
  const ast = getAst(source);

  const existing = getProp(ast, PROP);
  const value = existing?.value;
  if (value && !T.isArrayExpression(value)) {
    throw new Error(`expected "${PROP}" to have an array value`);
  }

  if (value && value.elements.length > 0 && value.loc?.start.line !== value.loc?.end.line) {
    const lastEl = value.elements.at(-1);
    if (!lastEl) {
      throw new Error('missing last element...');
    }

    const [, endOfLastEl] = getEnds(lastEl);
    return (
      source.slice(0, endOfLastEl) +
      `,\n${refsToAdd.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}` +
      source.slice(endOfLastEl)
    );
  }

  // replace/print JSON printed refs
  const refs = [...(!value ? [] : JSON.parse(source.slice(...getEnds(value)))), ...refsToAdd];
  const refsSrc = `${JSON.stringify(PROP)}: [\n${refs
    .map((l) =>
      typeof l === 'string'
        ? `    ${JSON.stringify(l)},`
        : `    { "path": ${JSON.stringify(l.path)} },`
    )
    .join('\n')}\n  ]`;

  if (!existing) {
    const endOfLastProp = getEndOfLastProp(ast);
    return source.slice(0, endOfLastProp) + `,\n  ${refsSrc}` + source.slice(endOfLastProp);
  }

  const [start, end] = getEnds(existing);
  return source.slice(0, start) + refsSrc + source.slice(end);
}

export function removeAllReferences(source: string) {
  const ast = getAst(source);
  const existing = getProp(ast, PROP);
  if (!existing) {
    return source;
  }
  return snip(source, [getExpandedEnds(source, existing)]);
}

export function removeReferences(source: string, refs: string[]) {
  const ast = getAst(source);

  const existing = getProp(ast, PROP);
  const value = existing?.value;
  if (!value || !T.isArrayExpression(value)) {
    throw new Error(`expected "${PROP}" to have an array value`);
  }

  return snip(
    source,
    refs.map((ref) => {
      const el = value.elements.find((e) => T.isStringLiteral(e) && e.value === ref);
      if (!el) {
        throw new Error(`unable to find reference "${ref}"`);
      }

      return getExpandedEnds(source, el);
    })
  );
}

export function replaceReferences(
  source: string,
  replacements: Array<[path: string, pkgId: string]>
) {
  const ast = getAst(source);

  const existing = getProp(ast, PROP);
  const value = existing?.value;
  if (!value || !T.isArrayExpression(value)) {
    throw new Error(`expected "${PROP}" to have an array value`);
  }

  return snip(
    source,
    replacements.map(([path, pkgId]) => {
      const el = value.elements.find((e) => {
        if (!T.isObjectExpression(e)) return;
        const prop = getProp(e, 'path');
        if (!prop || !T.isStringLiteral(prop.value)) return;
        return prop.value.value === path;
      });

      if (!el) {
        throw new Error(`unable to find reference with path "${path}"`);
      }

      return [...getEnds(el), JSON.stringify(pkgId)];
    })
  );
}
