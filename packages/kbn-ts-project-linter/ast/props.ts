/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { T } from './babel';
import { getEnds } from './ends';

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
