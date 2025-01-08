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
 * Removes a property from a JSONc object. If the property does not exist the source is just returned
 */
export function removeProp(
  /** the jsonc to modify */
  source: string,
  /** The key to set */
  key: string,
  /** extra key-value options */
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

export function setProp(
  /** the jsonc to modify */
  source: string,
  /** The key to set */
  key: string,
  /** the value of the key */
  value: any,
  /** extra key-value options */
  opts?: {
    /** by default, if the key isn't already in the json, it will be added at the bottom. Set this to true to add the key at the top instead */
    insertAtTop?: boolean;
    /** by default, if the key isn't already in the json, it will be added at the bottom. Set this to an existing property node to have the key added after this node */
    insertAfter?: T.ObjectProperty;
    /** In order to set the property an object other than the root object, parse the source and pass the node of the desired object here (make sure to also pass spaces) */
    node?: T.ObjectExpression;
    /** This overrides the default "  " spacing used for multi line or new properties that are added */
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

export function getPropFromSource(source: string, name: string) {
  return getProp(getAst(source), name);
}
