/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAst } from './ast';
import { stringify, redentJson } from './json';
import { snip } from './snip';
import { T } from './babel';
import { getEnds, getExpandedEnds } from './ends';

export function getProp(obj: T.ObjectExpression, name: string) {
  return obj.properties.find((p): p is T.ObjectProperty & { key: T.StringLiteral } => {
    return T.isObjectProperty(p) && T.isStringLiteral(p.key) && p.key.value === name;
  });
}

export function getEndOfLastProp(obj: T.ObjectExpression) {
  if (obj.properties.length === 0) {
    throw new Error('object has no properties');
  }

  return obj.properties.reduce((acc, prop) => Math.max(acc, getEnds(prop)[1]), 0);
}

/**
 * Removes a named property from a JSONC object. If the property does not exist
 * the source is returned unchanged.
 * @param source - The JSONC source text to modify.
 * @param key - The property key to remove.
 * @param opts - Optional configuration.
 * @param opts.node - The AST node of the object to modify. When provided, skips
 * re-parsing `source`.
 * @returns The modified JSONC source text, or the original if the property does not exist.
 */
export function removeProp(
  source: string,
  key: string,
  opts?: {
    node?: T.ObjectExpression;
  }
) {
  const ast = opts?.node ?? getAst(source);
  const prop = getProp(ast, key);
  if (!prop) {
    return source;
  }

  return snip(source, [getExpandedEnds(source, prop)]);
}

/**
 * Sets a property in a JSONC source string. If the property already exists its
 * value is replaced; otherwise it is inserted according to the `opts` configuration.
 * @param source - The JSONC source text to modify.
 * @param key - The property key to set.
 * @param value - The property value. Intentionally typed as `any` because valid JSON
 * property values include booleans, strings, numbers, arrays, and objects.
 * @param opts - Optional configuration.
 * @param opts.insertAtTop - When `true`, new properties are inserted at the top of the
 * object rather than at the bottom. Defaults to `false`.
 * @param opts.insertAfter - An existing property node after which the new property is
 * inserted. Takes precedence over `insertAtTop` when the key is new.
 * @param opts.node - The AST node of the object to modify. When provided, skips
 * re-parsing `source`.
 * @param opts.spaces - Overrides the default `"  "` indentation used for new or
 * multi-line properties.
 * @returns The modified JSONC source text.
 */
export function setProp(
  source: string,
  key: string,
  value: any,
  opts?: {
    insertAtTop?: boolean;
    insertAfter?: T.ObjectProperty;
    node?: T.ObjectExpression;
    spaces?: string;
  }
) {
  const ast = opts?.node ?? getAst(source);
  const prop = getProp(ast, key);
  const spaces = opts?.spaces ?? '  ';
  const newPropJson = `${stringify(key)}: ${redentJson(value, spaces)}`;

  if (!prop) {
    if (!ast.properties.length) {
      return `{\n${spaces}${newPropJson}\n}`;
    }

    if (opts?.insertAtTop) {
      const [start] = getEnds(ast.properties[0]);
      return snip(source, [[start, start, `${newPropJson},\n${spaces}`]]);
    } else {
      const insertAt = opts?.insertAfter ? getEnds(opts.insertAfter)[1] : getEndOfLastProp(ast);
      return snip(source, [[insertAt, insertAt, `,\n${spaces}${newPropJson}`]]);
    }
  }

  return snip(source, [[...getEnds(prop), newPropJson]]);
}

/**
 * Parses a JSONC source string and returns the AST node for a named property.
 * @param source - The JSONC source text to parse.
 * @param name - The property name to look up.
 * @returns The matching `ObjectProperty` node, or `undefined` if not found.
 */
export function getPropFromSource(source: string, name: string) {
  return getProp(getAst(source), name);
}
